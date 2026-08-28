# Tiers destinataires de données

> Exigé par `docs/regles-vie-privee.md`. **À mettre à jour AVANT d'ajouter tout
> service externe.** Chaque service listé ici est une responsabilité juridique du
> propriétaire de Beralshopp : c'est lui qui répond des données transmises.
>
> Dernière vérification du code : **28 août 2026**.

---

## Ce que la boutique n'utilise PAS

Vérifié dans le code, et c'est un choix à préserver :

- **Aucun outil de mesure d'audience** — ni Google Analytics, ni Plausible, ni
  Matomo.
- **Aucun pixel publicitaire** — ni Meta, ni TikTok, ni Google Ads.
- **Aucun outil de suivi de session ou de carte de chaleur** — ni Hotjar, ni
  Clarity.
- **Aucune police distante** — les polices sont servies depuis le domaine, donc
  aucune adresse IP de visiteur n'est transmise à Google Fonts.
- **Aucune API d'intelligence artificielle** appelée avec des données clients.

**Conséquence directe : aucun bandeau de consentement n'est requis.** Les deux
seuls cookies posés sont strictement nécessaires (voir plus bas). Un bandeau
serait même contre-productif — il habituerait le visiteur à cliquer « accepter »
sans lire.

---

## Services recevant des données

| Service     | Rôle                                         | Données transmises                                                                                 | Hébergement                                                                     | Transfert hors Rwanda |
| ----------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------- |
| **Vercel**  | Hébergement du site et des fonctions serveur | Toute donnée transitant par une page : adresse IP, en-têtes du navigateur, contenu des formulaires | Fonctions en région `fra1` (Francfort, Allemagne) ; réseau de diffusion mondial | **Oui — Allemagne**   |
| **Neon**    | Base de données PostgreSQL                   | Comptes clients, commandes, adresses de livraison, paniers, sessions                               | `eu-central-1` (Francfort, Allemagne)                                           | **Oui — Allemagne**   |
| **Pesapal** | Encaissement des paiements                   | Nom, téléphone, e-mail, montant et référence de commande                                           | Kenya                                                                           | **Oui — Kenya**       |

---

## Détail par service

### Vercel — hébergement

Reçoit tout ce qui transite par le site, y compris les adresses IP des visiteurs
et le contenu des formulaires. Les journaux de requêtes sont conservés par Vercel
selon sa propre politique.

Les fonctions serveur sont épinglées à Francfort (`apps/web/vercel.json`,
`regions: ["fra1"]`). Le réseau de diffusion sert en revanche les fichiers
statiques depuis le point de présence le plus proche du visiteur, partout dans le
monde — mais ces fichiers ne contiennent aucune donnée personnelle.

### Neon — base de données

Détient **l'intégralité** des données personnelles : comptes, commandes,
adresses, historiques. Sauvegardes automatiques assurées par Neon.

> ⚠️ **Une seule base sert au développement ET à la production.** Cela contrevient
> à la règle « ne jamais utiliser des données de production en développement ».
> Une base de développement distincte, alimentée par des données fictives, doit
> être créée.

### Pesapal — paiement

Reçoit le nom, le téléphone, l'e-mail et le montant, nécessaires à
l'encaissement. Beralshopp **ne voit ni ne stocke aucune donnée bancaire** : le
client saisit sa carte ou son code Mobile Money chez Pesapal, jamais sur la
boutique. C'est le point le plus favorable de l'architecture actuelle.

---

## Cookies déposés

| Cookie               | Rôle                                          | Durée                                       | Consentement requis          |
| -------------------- | --------------------------------------------- | ------------------------------------------- | ---------------------------- |
| `beralshopp_session` | Maintient la connexion du client              | 30 jours (12 h pour un compte à privilèges) | Non — strictement nécessaire |
| `beralshopp_panier`  | Rattache un panier à un visiteur non connecté | Durée du panier                             | Non — strictement nécessaire |

Aucun cookie publicitaire ni de mesure d'audience.

---

## À faire avant d'ajouter un service

1. Ajouter une ligne au tableau ci-dessus **avant** d'écrire la moindre ligne de
   code.
2. Vérifier où l'entreprise héberge les données.
3. Mettre à jour la politique de confidentialité en conséquence.
4. Si le service peut être évité, l'éviter.
