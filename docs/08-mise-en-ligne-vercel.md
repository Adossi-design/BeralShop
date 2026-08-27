# 08 — Mise en ligne sur Vercel

> Procédure à suivre dans l'ordre. Chaque étape se vérifie avant de passer à la suivante.
>
> **Règle absolue : aucun secret ne doit être collé dans une conversation, un ticket, un
> message ou un fichier suivi par git.** Les secrets se saisissent uniquement dans
> l'interface de Vercel.

---

## 0. Avant de commencer

| Élément                       | État                                               |
| ----------------------------- | -------------------------------------------------- |
| Dépôt GitHub                  | `Adossi-design/BeralShop`, branche `main`          |
| Compte Vercel                 | à créer sur vercel.com, **connexion via GitHub**   |
| Plan Vercel                   | **Pro (20 $/mois) obligatoire** — voir document 04 |
| Base de données               | Neon, région Francfort, déjà migrée                |
| Secrets de production générés | `.env.production.local` (ignoré par git)           |

> ⚠️ **Le plan Hobby (gratuit) interdit l'usage commercial.** Déployer une boutique qui
> vend sous ce plan expose à une suspension sans préavis. Passer en Pro **avant** d'ouvrir
> au public.

---

## 1. Importer le projet

1. vercel.com → **Add New… → Project**
2. **Import Git Repository** → choisir `BeralShop`
3. Sur l'écran de configuration, **ne rien changer** : le fichier `vercel.json` du dépôt
   impose déjà la commande de compilation, le dossier de sortie, la région `fra1` et la
   tâche planifiée.
4. **Ne pas déployer tout de suite.** Ouvrir d'abord **Environment Variables** (étape 2).

> Si le premier déploiement part sans les variables, il échouera : la compilation lit la
> base de données pour pré-générer les fiches produit.

---

## 2. Variables d'environnement

Dans **Settings → Environment Variables**. Pour chacune, cocher les environnements
indiqués dans la colonne « Portée ».

### À reprendre telles quelles depuis `.env.local`

| Variable                      | Portée              | Rôle                                  |
| ----------------------------- | ------------------- | ------------------------------------- |
| `DATABASE_URL`                | **Production seul** | Base Neon (via le pooler)             |
| `DIRECT_URL`                  | **Production seul** | Migrations Prisma (connexion directe) |
| `PESAPAL_CONSUMER_KEY`        | Production          | Paiement                              |
| `PESAPAL_CONSUMER_SECRET`     | Production          | Paiement                              |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Toutes              | Bouton WhatsApp                       |
| `NEXT_PUBLIC_CONTACT_PHONE`   | Toutes              | Pied de page, page contact            |
| `NEXT_PUBLIC_CONTACT_EMAIL`   | Toutes              | Pied de page, page contact            |

> **Pourquoi `DATABASE_URL` en Production seulement ?** Si les déploiements de
> prévisualisation partageaient cette variable, chaque branche d'essai écrirait dans les
> vraies commandes et le vrai stock. Une expérimentation ne doit jamais pouvoir toucher
> les données des clients.

### À saisir avec une valeur NOUVELLE

| Variable               | Portée     | Valeur                                                   |
| ---------------------- | ---------- | -------------------------------------------------------- |
| `AUTH_SECRET`          | Production | copier depuis `.env.production.local`                    |
| `CRON_SECRET`          | Production | copier depuis `.env.production.local`                    |
| `NEXT_PUBLIC_SITE_URL` | Production | l'URL de production, **sans barre oblique finale**       |
| `PESAPAL_ENVIRONMENT`  | Production | `production`                                             |
| `PESAPAL_IPN_ID`       | Production | obtenu à l'étape 5 — laisser vide au premier déploiement |

> **Pourquoi un `AUTH_SECRET` neuf ?** Il signe les jetons de session. Celui du
> développement a circulé sur un poste de travail ; le réutiliser en production
> reviendrait à confier la serrure de la boutique à une clé déjà prêtée.

> **`NEXT_PUBLIC_SITE_URL`** est intégrée à la compilation, pas lue à l'exécution. Toute
> modification exige un **redéploiement** pour être prise en compte.

### À NE PAS créer

`NODE_ENV` (Vercel la gère — la forcer provoque des anomalies difficiles à diagnostiquer),
`SEED_DEMO_DATA` (créerait de faux produits), et toutes les variables des lots futurs :
`REDIS_URL`, `R2_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `SMS_PROVIDER_API_KEY`,
`WHATSAPP_API_TOKEN`, `FX_*`, `SENTRY_DSN`, `NEXT_PUBLIC_IMAGE_HOST`. Aucune n'est lue par
le code aujourd'hui ; on les ajoutera quand chaque service sera réellement branché.

---

## 3. Premier déploiement

**Deploy**. Compter 2 à 4 minutes.

En cas d'échec, ouvrir le journal de compilation. Les deux causes les plus fréquentes :

- `DATABASE_URL n'est pas défini` → variable oubliée ou mauvaise portée.
- `Can't reach database server` → Neon en veille. Relancer : le client rejoue
  automatiquement les échecs de réveil, mais la toute première compilation peut tomber
  pendant la fenêtre de démarrage.

---

## 4. Vérifications après déploiement

Dans l'ordre. Ne pas passer à l'étape 5 tant que les quatre ne passent pas.

| Contrôle         | Adresse         | Résultat attendu                               |
| ---------------- | --------------- | ---------------------------------------------- |
| Santé de la base | `/api/v1/sante` | `{"statut":"ok"}`                              |
| Accueil          | `/`             | Produits affichés, images chargées             |
| Fiche produit    | `/produits/…`   | Photos, variantes, ajout au panier fonctionnel |
| Référencement    | `/sitemap.xml`  | URLs en `https://` avec le bon domaine         |

Si le sitemap affiche `localhost`, `NEXT_PUBLIC_SITE_URL` est erronée ou le
redéploiement n'a pas eu lieu.

---

## 5. Notification de paiement Pesapal

Pesapal prévient la boutique qu'un paiement a abouti en appelant une adresse — l'IPN.
Cette adresse doit pointer vers le site **en production**. Celle enregistrée aujourd'hui
pointe ailleurs : sans cette étape, **un client peut payer sans que la commande passe en
« payée »**.

```bash
# Sur ton poste, après avoir mis NEXT_PUBLIC_SITE_URL à l'URL de production
pnpm pesapal:ipn
```

Le script affiche un identifiant. Le saisir dans Vercel comme `PESAPAL_IPN_ID`, puis
**redéployer**.

---

## 6. Nom de domaine

**Settings → Domains → Add** → `beralshopp.com`. Vercel indique les enregistrements DNS à
créer chez le registraire. Le certificat HTTPS est automatique.

Une fois le domaine actif : remettre `NEXT_PUBLIC_SITE_URL` à `https://beralshopp.com`,
**redéployer**, puis refaire l'étape 5 (l'IPN doit pointer vers le domaine définitif).

---

## 7. Migrations futures

La compilation ne joue **pas** les migrations. Après toute modification du schéma :

```bash
pnpm db:migrate        # en développement, crée la migration
pnpm --filter @beralshopp/db run migrate:deploy   # l'applique à la base de production
```

Toujours appliquer la migration **avant** de déployer le code qui en dépend.

---

## 8. Ce qui reste bloquant avant d'ouvrir au public

Mettre le site en ligne et **ouvrir la boutique** sont deux choses différentes. Le site
peut être déployé dès maintenant ; il ne doit pas encaisser d'argent tant que ces points
ne sont pas levés. `pnpm preflight` les vérifie tous.

| Point                                       | Action                                                                |
| ------------------------------------------- | --------------------------------------------------------------------- |
| **Aucun compte administrateur**             | `pnpm db:admin` — sans lui, personne ne peut traiter les commandes    |
| **14 produits de démonstration en vitrine** | `pnpm db:depublier-demo` — ils n'existent pas et sont commandables    |
| **Stock provisoire de 10**                  | Corriger les quantités réelles dans `/admin/produits`                 |
| **Identifiants Pesapal refusés**            | Vérifier les clés et `PESAPAL_ENVIRONMENT=production`                 |
| **Aucun envoi d'e-mail**                    | `RESEND_API_KEY` — sans elle, pas de réinitialisation de mot de passe |
| **Mentions légales non relues**             | Dénomination, RDB, TIN, siège — à faire valider                       |

> **Le plus urgent des six** : les produits de démonstration. Un client qui commande et
> paie un article inexistant, c'est un litige et un remboursement dès la première semaine.
> `pnpm db:republier-demo` les remet en vitrine si tu préfères garder une boutique
> visuellement remplie le temps d'étoffer le vrai catalogue — mais alors, ne pas ouvrir le
> paiement.
