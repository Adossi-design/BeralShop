# 03 — Paiements & devises

---

## 1. Architecture multi-prestataires (dès la V1)

Tu utilises Pesapal aujourd'hui. **Pesapal ne sera jamais appelé directement par le code
métier.** Il est une implémentation derrière une interface :

```typescript
// packages/core/payments/provider.ts
export interface PaymentProvider {
  readonly id: string; // 'pesapal', 'cinetpay', 'flutterwave'
  supports(currency: string, country: string): boolean;

  createPayment(input: {
    orderId: string;
    amountMinor: number;
    currency: string;
    customer: { name: string; phone: string; email?: string };
    callbackUrl: string;
    idempotencyKey: string;
  }): Promise<{ redirectUrl: string; providerReference: string }>;

  // Interroge le prestataire — SEULE source de vérité sur le statut d'un paiement
  getStatus(providerReference: string): Promise<PaymentStatus>;

  refund(providerReference: string, amountMinor: number, reason: string): Promise<RefundResult>;

  // Traduit une notification entrante en événement interne (sans lui faire confiance)
  parseWebhook(req: Request): Promise<{ providerReference: string }>;
}
```

Un **routeur de paiement** choisit le prestataire selon le pays et la devise du client :

```typescript
const provider = paymentRouter.resolve({ country: 'RW', currency: 'RWF' });
// → PesapalProvider

const provider = paymentRouter.resolve({ country: 'CI', currency: 'XOF' });
// → CinetPayProvider (ajouté en V2, zéro modification du code de commande)
```

Ajouter un prestataire = écrire une classe qui implémente l'interface, plus une ligne de
configuration. **Aucune modification du panier, des commandes ou du tableau de bord.**
Coût estimé par prestataire supplémentaire : 3 à 5 jours.

---

## 2. Intégration Pesapal (API 3.0)

### Points vérifiés dans la documentation officielle

| Élément                     | Valeur                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Base bac à sable            | `https://cybqa.pesapal.com/pesapalv3/api/`                                                                                  |
| Base production             | `https://pay.pesapal.com/v3/api/`                                                                                           |
| Authentification            | `POST /Auth/RequestToken` avec `consumer_key` + `consumer_secret` → jeton **valable 5 minutes**, envoyé ensuite en `Bearer` |
| Enregistrement notification | `POST /URLSetup/RegisterIPN` → renvoie un `ipn_id`                                                                          |
| Création de paiement        | `POST /Transactions/SubmitOrderRequest` → renvoie une **URL de redirection** + un `OrderTrackingId`                         |
| Vérification du statut      | `GET /Transactions/GetTransactionStatus?orderTrackingId=...`                                                                |
| Devises acceptées           | KES, USD, EUR, GBP, UGX, TZS, ZMW, **RWF** ✅                                                                               |
| Pays couverts               | Kenya, Ouganda, Tanzanie, Malawi, **Rwanda**, Zambie, Zimbabwe                                                              |
| Commission                  | **≈ 3,5 %** par transaction réussie, sans frais d'installation ni d'abonnement _(à reconfirmer dans ton contrat marchand)_  |

### Règle de sécurité centrale

> Pesapal indique explicitement qu'il faut appeler `GetTransactionStatus` **aussi bien au
> retour du client sur la page de callback que lors de la réception de la notification IPN**.

Concrètement, dans Beralshop :

- ❌ Le client revient sur `/paiement/retour?status=success` → **on ne confirme rien**.
  N'importe qui peut taper cette URL dans son navigateur.
- ❌ Une notification IPN arrive en disant « payé » → **on ne confirme rien** non plus.
- ✅ On récupère l'`OrderTrackingId`, **notre serveur appelle Pesapal** avec ses propres
  identifiants, et c'est **cette réponse-là** qui fait autorité.

Le webhook ne sert qu'à déclencher la vérification. Il ne transporte jamais de vérité.

### Gestion du jeton de 5 minutes

Le jeton expire vite. Il est mis en cache dans Redis avec une expiration à **4 minutes 30**,
et renouvelé automatiquement. Une requête qui reçoit un `401` réessaie une fois avec un
jeton frais. Sans cela, une commande échouerait aléatoirement en pleine journée.

### Séquence complète

```
1. Client valide son panier
   → serveur RECALCULE les montants depuis la base (jamais depuis le navigateur)
   → réservation du stock (transaction SQL)
   → création de la commande, statut EN_ATTENTE_PAIEMENT, numéro BRL-2026-000123
   → création d'un enregistrement `payments` avec une clé d'idempotence unique

2. SubmitOrderRequest vers Pesapal
   → merchant_reference = BRL-2026-000123
   → on stocke l'OrderTrackingId retourné
   → redirection du client vers l'URL de paiement Pesapal

3. Le client paie (MTN MoMo, Airtel Money, Visa, Mastercard...)

4a. Pesapal appelle notre IPN         4b. Le client revient sur notre callback
        │                                      │
        └──────────────┬───────────────────────┘
                       ▼
        Le serveur appelle GetTransactionStatus(orderTrackingId)
                       │
        ┌──────────────┼───────────────┬──────────────┐
        ▼              ▼               ▼              ▼
     REUSSI        ECHOUE          ANNULE       EN_ATTENTE
        │              │               │              │
        │              │               │              └─► re-vérification
        │              │               │                  automatique à
        │              └───────┬───────┘                  1, 5, 15, 60 min
        │                      ▼
        │              libération du stock
        │              le client peut réessayer
        ▼
   commande PAYEE
   stock décrémenté définitivement
   e-mail + SMS de confirmation
   notification dans le tableau de bord admin
```

### Trois protections indispensables

**Idempotence.** Chaque tentative de paiement porte une clé unique. Si l'IPN arrive deux fois
(cela arrive régulièrement), ou si le client actualise la page de retour, la commande n'est
traitée qu'une seule fois. Sans cela : doubles confirmations, stock décrémenté deux fois,
comptabilité fausse.

**Réconciliation automatique.** Une tâche planifiée toutes les 15 minutes reprend toutes les
commandes `EN_ATTENTE_PAIEMENT` de plus de 10 minutes et réinterroge Pesapal. Elle rattrape
les cas où l'IPN n'est jamais arrivé (panne réseau, indisponibilité momentanée de notre
serveur). **C'est ce mécanisme qui évite les « j'ai payé mais ma commande n'apparaît pas ».**

**Journal immuable.** Chaque échange avec Pesapal est enregistré tel quel dans
`payment_events`. En cas de litige avec un client ou avec Pesapal, la preuve existe.

### Environnements

Développement complet sur le **bac à sable Pesapal**, avec un jeu de tests couvrant les
cinq issues : réussi, échoué, annulé, en attente, remboursé. Passage en production
uniquement après validation de ces cinq scénarios.

---

## 3. ⚠️ Point d'attention majeur sur ton plan d'expansion

**Pesapal ne couvre pas les pays que tu vises en Afrique de l'Ouest et Centrale.**

| Pays visé        | Pesapal | Solution recommandée                                                                                                                                        |
| ---------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🇷🇼 Rwanda        | ✅      | **Pesapal** (déjà en place)                                                                                                                                 |
| 🇨🇮 Côte d'Ivoire | ❌      | CinetPay ou PayDunya (Orange Money, MTN, Moov, Wave)                                                                                                        |
| 🇸🇳 Sénégal       | ❌      | CinetPay ou PayDunya (Orange Money, Wave, Free Money)                                                                                                       |
| 🇧🇯 Bénin         | ❌      | CinetPay (MTN, Moov)                                                                                                                                        |
| 🇨🇲 Cameroun      | ❌      | CinetPay (Orange Money, MTN MoMo)                                                                                                                           |
| 🇨🇩 RDC           | ❌      | CinetPay (M-Pesa, Orange Money, Airtel)                                                                                                                     |
| 🇹🇩 **Tchad**     | ❌      | **Aucun agrégateur majeur ne le couvre.** Intégration directe Airtel Money Tchad / Moov Africa Tchad, ou opérateur local. **À investiguer spécifiquement.** |

**Ce que ça change pour le projet :** rien sur le calendrier V1 — Rwanda + Pesapal reste le
lancement. Mais cela confirme que **l'interface `PaymentProvider` n'est pas un luxe : c'est
une nécessité structurelle**, à écrire dès le premier jour. Elle représente environ 4 heures
de travail en V1 et évite une refonte complète du tunnel de commande en V2.

Recommandation : **CinetPay** comme second prestataire (couvre 6 de tes 7 pays cibles,
une seule intégration). Le Tchad fera l'objet d'une étude séparée.

---

## 4. Multi-devises — comment éviter que les prix bougent tout seuls

C'est le point que tu as explicitement soulevé, et il mérite une réponse précise.

### Principe : une seule source de vérité

Tous les prix du catalogue sont saisis et stockés en **RWF uniquement**. Les autres devises
ne sont **jamais** des prix stockés — ce sont des **affichages calculés**.

Cela élimine d'un coup le problème classique : deux prix stockés qui se désynchronisent.

### Cycle de vie d'un taux de change

```
1. Une fois par jour à heure fixe, une tâche récupère les taux depuis un
   fournisseur fiable (ex. exchangerate.host ou l'API d'une banque centrale)

2. On applique une MARGE DE SÉCURITÉ de 3 %
   → protège contre la volatilité intra-journalière et les écarts de conversion bancaire
   → paramétrable depuis le tableau de bord admin

3. On applique un ARRONDI COMMERCIAL selon la devise
   RWF  → arrondi aux 100 Frw supérieurs     12 347 → 12 400 Frw
   XAF  → arrondi aux 25 FCFA supérieurs      6 213 →  6 225 FCFA
   USD  → arrondi à x,99                       19,43 →    19,99 $

4. Le taux est enregistré dans `fx_rates` avec sa date de validité
   → on garde l'historique : indispensable pour la comptabilité et les litiges

5. ⚠️ Si la récupération échoue, on CONSERVE le dernier taux valide
   et on alerte l'admin. On n'affiche JAMAIS un prix calculé avec un taux inconnu.
```

### Le verrou anti-variation

**Au moment où le client valide sa commande, le taux utilisé est copié dans la commande
(`fx_rate_used`) et n'est plus jamais recalculé.**

Conséquence : entre la validation du panier et le paiement, même si le taux change à la
seconde près, **le client paie exactement le montant affiché**. Le total de la commande est
figé pour toujours.

De plus :

- Le panier conserve le taux pendant **30 minutes**. Au-delà, il est recalculé et le client
  est informé clairement (« Les prix ont été actualisés »). Pas de changement silencieux.
- La commande stocke les deux devises : `currency_display` (ce que le client voit, ex. XAF)
  et `currency_settlement` (ce que tu encaisses réellement, ex. RWF). Ta comptabilité reste
  toujours dans une devise unique.

### Choix de la devise par le client

Détection automatique du pays (en-tête géographique Cloudflare) → devise proposée par défaut,
mais **toujours modifiable manuellement** et mémorisée dans le profil. La détection
automatique seule est source de frustration (diaspora, VPN, voyageurs).

---

## 5. Ce qui est livré en V1 vs plus tard

| Fonction                                      | V1  | V2  | V3  |
| --------------------------------------------- | --- | --- | --- |
| Interface `PaymentProvider`                   | ✅  |     |     |
| Pesapal (MoMo, Airtel, Visa, Mastercard)      | ✅  |     |     |
| Idempotence + réconciliation automatique      | ✅  |     |     |
| Remboursements depuis l'admin                 | ✅  |     |     |
| Tables devises/taux + montants en entiers     | ✅  |     |     |
| Affichage multi-devises pour le client        |     | ✅  |     |
| CinetPay (zone FCFA + RDC)                    |     | ✅  |     |
| Paiement à la livraison                       |     | ✅  |     |
| Paiement en plusieurs fois                    |     |     | ✅  |
| Portefeuille Beralshop / reversement vendeurs |     |     | ✅  |

---

## Sources

- [Pesapal — Authentication](https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/authentication)
- [Pesapal — SubmitOrderRequest](https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/submitorderrequest)
- [Pesapal — RegisterIPNURL](https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/registeripnurl)
- [Pesapal — GetTransactionStatus](https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/gettransactionstatus)
- [Accepting Payments in Rwanda — PSPs, Compliance & Fees](https://payatlas.com/countries/rwanda-rw)
- [CinetPay — Documentation & pays couverts](https://docs.cinetpay.com/api/1.0-en/checkout/univers)
