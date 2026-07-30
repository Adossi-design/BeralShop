# 07 — Mise en ligne

Procédure de déploiement et d'exploitation de Beralshopp.

> **Avant toute chose :** `pnpm preflight`
> Ce contrôle vérifie tout ce qui doit être vrai pour qu'une vraie commande, payée
> par un vrai client, arrive à destination. Ne pas ouvrir la boutique tant qu'il
> signale un point **BLOQUANT**.

---

## 1. Comptes à créer — tous à ton nom

| Service                       | Rôle                | Plan                                                             |
| ----------------------------- | ------------------- | ---------------------------------------------------------------- |
| **GitHub**                    | Dépôt privé du code | Gratuit                                                          |
| **Vercel**                    | Hébergement du site | **Pro, 20 $/mois** — le plan gratuit interdit l'usage commercial |
| **Neon**                      | Base PostgreSQL     | Gratuit puis ~19 $/mois                                          |
| **Cloudflare**                | DNS, CDN, pare-feu  | Gratuit                                                          |
| **Cloudflare R2**             | Photos produits     | ~1–5 $/mois                                                      |
| **Resend**                    | E-mails de commande | Gratuit puis ~20 $/mois                                          |
| **Pesapal**                   | Encaissement        | Sans frais fixes, ~3,5 % par transaction                         |
| **UptimeRobot** ou équivalent | Surveillance        | Gratuit                                                          |

⚠️ **Chaque compte doit être créé avec ton adresse e-mail**, jamais une autre. C'est
ce qui garantit que tu restes propriétaire de l'ensemble.

---

## 2. Déploiement sur Vercel

```
1. Pousser le dépôt sur GitHub (privé)
2. Vercel → Add New Project → importer le dépôt
3. Root Directory : laisser la racine  (vercel.json s'en charge)
4. Renseigner les variables d'environnement (section 3)
5. Deploy
```

Le fichier [`vercel.json`](../vercel.json) fixe déjà :

- la commande de build du monorepo ;
- la **région `fra1`** (Francfort), au plus près de la base ;
- une **tâche planifiée toutes les 10 minutes** sur `/api/v1/taches`.

### La tâche planifiée n'est pas optionnelle

Elle fait deux choses indispensables :

1. **Libère le stock des commandes impayées expirées.** Sans elle, un panier
   abandonné au moment du paiement immobilise du stock indéfiniment, et la boutique
   affiche « rupture » sur des produits disponibles.
2. **Réconcilie les paiements** dont la notification n'est jamais arrivée. C'est ce
   qui évite le pire scénario commercial : le client a payé, n'a rien reçu, et
   t'accuse.

Elle est protégée par `CRON_SECRET`. **Sans ce secret, la route refuse tout appel** —
y compris celui de Vercel. Le préflight le vérifie.

---

## 3. Variables d'environnement de production

À saisir dans Vercel → Settings → Environment Variables, portée **Production**.

| Variable                       | Valeur                                                 |
| ------------------------------ | ------------------------------------------------------ |
| `DATABASE_URL`                 | Neon, **avec** `-pooler`                               |
| `DIRECT_URL`                   | Neon, **sans** `-pooler`                               |
| `NEXT_PUBLIC_SITE_URL`         | `https://beralshopp.com` — sans barre finale           |
| `AUTH_SECRET`                  | `openssl rand -base64 32`                              |
| `CRON_SECRET`                  | `openssl rand -base64 32` — **différent du précédent** |
| `PESAPAL_CONSUMER_KEY`         | Clés **de production**                                 |
| `PESAPAL_CONSUMER_SECRET`      |                                                        |
| `PESAPAL_ENVIRONMENT`          | `production`                                           |
| `PESAPAL_IPN_ID`               | Obtenu par `pnpm pesapal:ipn`                          |
| `NEXT_PUBLIC_IMAGE_HOST`       | Domaine public R2                                      |
| `R2_*`                         | Accès au stockage des images                           |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envoi des e-mails                                      |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`  | Format international                                   |
| `SEED_DEMO_DATA`               | **`false`** — impératif                                |

⚠️ Tout ce qui commence par `NEXT_PUBLIC_` est **envoyé au navigateur et visible par
n'importe quel visiteur**. Aucune clé secrète ne doit jamais porter ce préfixe.

---

## 4. Première mise en production de la base

```bash
# 1. Appliquer les migrations sur la base de production
pnpm --filter @beralshopp/db run migrate:deploy

# 2. Données de référence (devises, pays, catégories, livraison)
#    SEED_DEMO_DATA doit valoir false : aucun produit d'exemple ne sera créé
pnpm db:seed

# 3. Vérifier que les objets manuels sont bien en place
pnpm db:verify

# 4. Créer le compte administrateur
pnpm db:admin
```

`pnpm db:admin` est **volontairement en ligne de commande**, jamais une page web :
un formulaire de création d'administrateur exposé sur Internet est une porte
d'entrée, même protégé.

---

## 5. Pesapal en production

```bash
# 1. Basculer PESAPAL_ENVIRONMENT sur production, avec les clés marchand
# 2. Vérifier les identifiants
pnpm pesapal:check

# 3. Enregistrer l'URL de notification (une seule fois)
pnpm pesapal:ipn -- https://beralshopp.com
#    → reporter le PESAPAL_IPN_ID obtenu dans Vercel
```

### Puis une vraie transaction, obligatoirement

Avant d'annoncer l'ouverture, passe **une commande réelle de faible montant** avec
ton propre téléphone. Cela ne teste pas la logique — elle l'est déjà — mais trois
choses que rien d'autre ne peut vérifier :

- ton compte marchand est correctement configuré ;
- l'argent arrive réellement sur ton compte ;
- le nom « Beralshopp » s'affiche correctement sur l'écran de paiement de tes clients.

---

## 6. Domaine et sécurité réseau

```
1. Cloudflare → ajouter beralshopp.com
2. Chez ton registraire, pointer les serveurs de noms vers Cloudflare
3. Vercel → Domains → ajouter le domaine, suivre les instructions DNS
4. Cloudflare : SSL/TLS en « Full (strict) »
5. Activer le pare-feu applicatif et la protection anti-déni de service (inclus)
```

---

## 7. Surveillance

| À surveiller         | Comment                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| Le site répond       | `https://beralshopp.com/api/v1/sante` toutes les 5 min, alerte **SMS** |
| Erreurs applicatives | Sentry (`SENTRY_DSN`)                                                  |
| Tâches planifiées    | Vercel → Cron Jobs, vérifier l'absence d'échecs                        |
| Dérive de stock      | `pnpm db:reconcile` une fois par semaine                               |

Le point de santé répond `200` si la base répond, `503` sinon. Il est volontairement
avare en informations : c'est une route publique.

**Sans alerte SMS, une panne nocturne se découvre le lendemain matin par un client
mécontent.**

---

## 8. Sauvegardes

Neon assure les sauvegardes automatiques et la restauration à un instant précis.
Cela ne suffit pas.

| Quoi                             | Fréquence         | Où                                 |
| -------------------------------- | ----------------- | ---------------------------------- |
| Sauvegarde automatique Neon      | Continue          | Chez Neon                          |
| Restauration à un instant précis | 7 jours glissants | Chez Neon                          |
| **Export `pg_dump` chiffré**     | **Mensuel**       | **Ton propre stockage, hors Neon** |
| **Test de restauration réel**    | **Trimestriel**   | Base jetable                       |

Les deux dernières lignes sont celles qu'on saute — et ce sont les seules qui
protègent contre la perte d'accès au fournisseur lui-même.

**Une sauvegarde jamais testée n'est pas une sauvegarde.**

---

## 9. Conformité — à traiter avant l'ouverture commerciale

Ces points ne sont pas techniques et je ne peux pas les régler à ta place.

| Sujet                      | Action                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Mentions légales**       | Compléter dénomination sociale, immatriculation RDB, numéro fiscal TIN, siège, dans les pages Conditions et Confidentialité |
| **Protection des données** | La loi rwandaise de 2021 impose l'enregistrement des responsables de traitement auprès de la **NCSA**                       |
| **Facturation TVA / EBM**  | Vérifier avec ton comptable si tu es soumis à la facturation électronique exigée par la **RRA**                             |
| **Relecture juridique**    | Les trois pages légales sont des **brouillons**, signalés comme tels sur le site                                            |
| **Politique de retour**    | Les délais proposés (7 jours) sont des usages du commerce, pas des obligations vérifiées : c'est ta décision                |

---

## 10. Le jour de l'ouverture

```bash
pnpm preflight        # doit être vert
pnpm db:verify        # doit être vert
pnpm db:reconcile     # aucune dérive
```

Puis, dans l'ordre :

1. Une commande réelle de bout en bout, payée par toi.
2. Vérifier qu'elle apparaît dans `/admin/commandes` et que le stock a bougé.
3. Vérifier que l'argent est arrivé sur ton compte Pesapal.
4. Passer le statut jusqu'à « Livrée » et contrôler la page de suivi.
5. Alors seulement, communiquer.
