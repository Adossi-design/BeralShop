# 01 — Architecture technique

## 1. Résumé de la proposition

| Couche           | Technologie retenue                                 | Pourquoi                                                                                                                                                                |
| ---------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site web         | **Next.js 15** (App Router) + **TypeScript**        | Rendu serveur = pages rapides sur téléphone bas de gamme et réseau lent, et bon référencement Google. Un seul langage du front au back.                                 |
| Interface        | **Tailwind CSS** + **shadcn/ui**                    | Design sur mesure (identité Beralshopp propre), composants dont tu es propriétaire — pas de dépendance à un thème acheté.                                               |
| API              | **Route Handlers Next.js**, versionnées `/api/v1/*` | Même base de code que le site en V1, mais API publique documentée dès le départ → l'application mobile s'y branchera sans rien réécrire.                                |
| Logique métier   | Paquet **`packages/core`** séparé                   | Le cœur (commandes, paiements, stock) est isolé de Next.js. Si un jour il faut sortir l'API dans un service dédié, c'est un déplacement de dossier, pas une réécriture. |
| Base de données  | **PostgreSQL 16**                                   | Standard, gratuit, robuste, transactions fiables (indispensable pour stock + paiements), recherche plein texte intégrée. Portable partout.                              |
| Accès BDD        | **Prisma** (ORM) + migrations versionnées           | Schéma sous contrôle Git, migrations reproductibles, typage automatique.                                                                                                |
| Cache / files    | **Redis**                                           | Sessions, limitation de débit, panier invité, cache des taux de change.                                                                                                 |
| Tâches de fond   | **Inngest** (ou BullMQ si serveur dédié)            | Envoi d'e-mails, réconciliation des paiements, synchronisation fournisseurs — avec nouvelles tentatives automatiques.                                                   |
| Images           | **Cloudflare R2** + transformation d'images         | Stockage sans frais de sortie de données, conversion automatique en WebP/AVIF, redimensionnement selon l'écran. Point critique en Afrique.                              |
| Authentification | **Sessions en base + Argon2id** (voir §7)           | Cookie `httpOnly` contenant un jeton aléatoire, dont seule l'empreinte est stockée. Sessions révocables à tout instant.                                                 |
| Recherche        | **PostgreSQL FTS** (V1) → **Meilisearch** (V2)      | Voir §5.                                                                                                                                                                |
| Traductions      | **next-intl** + tables de traduction en base        | Français / Anglais / Arabe (avec sens d'écriture droite-à-gauche).                                                                                                      |
| Mobile (V3)      | **React Native + Expo**                             | Réutilise TypeScript, les types partagés et l'API v1. Une seule base de code Android + iOS.                                                                             |
| Dépôt            | **Monorepo Turborepo**                              | Web, mobile, API et types partagés dans un seul dépôt Git dont tu es propriétaire.                                                                                      |

---

## 2. Le choix structurant : monolithe modulaire, pas microservices

Deux options existaient :

**Option A — API séparée (NestJS) + site Next.js.**
Plus « propre » sur le papier. En pratique : deux déploiements, deux jeux d'authentification,
deux factures d'hébergement, deux fois plus de temps de développement. Justifié à partir de
plusieurs équipes ou d'un trafic très important. **Pas ton cas aujourd'hui.**

**Option B — Next.js unique, mais découpé en modules stricts. ✅ Recommandé**
Un seul déploiement, un seul hébergement, développement 30 à 40 % plus rapide.

Le risque habituel de l'option B, c'est le code « spaghetti » impossible à séparer plus tard.
On le neutralise par une règle non négociable dès le premier jour :

```
apps/
  web/                    → Next.js : pages, composants, routes API. AUCUNE logique métier.
  mobile/                 → Expo (V3)
  admin/                  → intégré dans web/ sous /admin (V1)
packages/
  core/                   → LOGIQUE MÉTIER PURE. Ne connaît ni Next.js ni React.
    catalog/              → produits, catégories, variantes, recherche
    cart/                 → panier, calcul des totaux
    orders/               → commandes, machine à états, numérotation
    payments/             → interface PaymentProvider + adaptateurs (pesapal/, ...)
    inventory/            → stock, réservations
    pricing/              → devises, taux de change, arrondis
    suppliers/            → interface SupplierAdapter + adaptateurs (sunsky/, ...) (V3)
    notifications/        → e-mail, SMS, WhatsApp
  db/                     → schéma Prisma + migrations
  shared/                 → types TypeScript communs web/mobile, validation Zod
  ui/                     → composants de design Beralshopp
```

**Règle :** une route API ne fait que trois choses — valider l'entrée, appeler un service de
`packages/core`, formater la réponse. Jamais de calcul de prix ou de requête SQL dans une page.

Conséquence concrète : le jour où le trafic impose de séparer l'API, `packages/core` est déjà
autonome. On l'emballe dans un serveur dédié en quelques jours, sans toucher au métier.

---

## 3. Pourquoi Next.js pour le marché africain

Ce n'est pas un choix de mode, c'est un choix de performance sur réseau contraint :

- **Rendu serveur (SSR/RSC)** : le téléphone reçoit du HTML déjà construit. Une application
  100 % côté client (React seul, Vue seul) oblige le téléphone à télécharger puis exécuter
  plusieurs centaines de kilooctets de JavaScript avant d'afficher quoi que ce soit —
  catastrophique en 3G sur un appareil d'entrée de gamme.
- **ISR (régénération statique incrémentale)** : les fiches produits et pages catégories sont
  pré-calculées et servies depuis le CDN. Une fiche produit consultée par 10 000 personnes ne
  déclenche pas 10 000 requêtes en base.
- **Référencement** : Google indexe correctement les fiches produits — essentiel pour la
  croissance organique face à Kikuu.
- **Un seul langage** (TypeScript) du site à l'API à l'application mobile.

**Objectifs de performance mesurés et tenus dès la V1 :**

| Indicateur                           | Cible              | Conditions de test               |
| ------------------------------------ | ------------------ | -------------------------------- |
| LCP (affichage du contenu principal) | < 2,5 s            | 3G lente, mobile milieu de gamme |
| Poids JS initial de l'accueil        | < 150 Ko compressé | —                                |
| Réponse API recherche                | < 300 ms (p95)     | 10 000 produits en base          |
| Score Lighthouse mobile              | ≥ 90               | Accueil et fiche produit         |

Ces cibles sont vérifiées automatiquement à chaque livraison de code (Lighthouse CI), pour
éviter la dérive progressive vers un site lent.

---

## 4. Circulation d'une commande (vue d'ensemble)

```
Client (navigateur ou app mobile)
      │
      ▼
  Cloudflare CDN  ────────────► images, CSS, pages statiques (réponse ~50 ms)
      │
      ▼
  Next.js  ──► Route API /api/v1/*
      │              │
      │              ├──► packages/core/cart      → recalcule les prix CÔTÉ SERVEUR
      │              ├──► packages/core/inventory → réserve le stock (transaction SQL)
      │              ├──► packages/core/orders    → crée la commande (statut EN_ATTENTE_PAIEMENT)
      │              └──► packages/core/payments  → PesapalProvider.createPayment()
      │                              │
      │                              ▼
      │                        API Pesapal ──► redirection du client vers la page de paiement
      │                              │
      │                              ▼
      │              Notification serveur-à-serveur (IPN) de Pesapal
      │                              │
      │                              ▼
      │              Le serveur RE-INTERROGE Pesapal (GetTransactionStatus)
      │              → jamais de confiance aveugle dans le message reçu
      │                              │
      ▼                              ▼
  PostgreSQL ◄──────────  Commande confirmée + stock décrémenté + événement journalisé
      │
      ▼
  Inngest (file de tâches) ──► e-mail de confirmation, SMS/WhatsApp, alerte admin
```

**Deux principes de sécurité visibles dans ce schéma :**

1. Le montant à payer est **toujours recalculé sur le serveur** à partir des prix en base.
   Le montant envoyé par le navigateur n'est jamais utilisé.
2. Une commande n'est confirmée que si **le serveur Beralshopp a lui-même vérifié le paiement
   auprès de Pesapal**. Un faux message de confirmation ne peut donc pas valider une commande.

---

## 5. Recherche produits — stratégie en deux temps

Ta demande : `écouteur Bluetooth` doit remonter tous les produits pertinents, avec filtres.

**V1 — PostgreSQL natif.** Suffisant, gratuit, aucune infrastructure supplémentaire :

- `tsvector` généré automatiquement, agrégeant nom + description + marque + mots-clés + référence
- extension `unaccent` → « ecouteur » trouve « écouteur »
- extension `pg_trgm` → tolérance aux fautes de frappe (« bluetoth » → « bluetooth »)
- index GIN → réponse en dizaines de millisecondes
- filtres prix / catégorie / disponibilité / nouveautés / meilleures ventes / promotions
  traités comme conditions SQL indexées

Limite réaliste : environ **50 000 produits** avec de bonnes performances.

**V2 — Meilisearch.** Bascule quand le catalogue dépasse cette taille ou quand tu veux la
recherche instantanée « à chaque lettre tapée », les synonymes gérés depuis l'admin et le
classement par pertinence commerciale. Coût : environ 10 $/mois auto-hébergé.

**Ce qui rend la bascule indolore :** le code n'appelle jamais la recherche directement. Il
appelle `SearchService.search(query, filters)`. Changer de moteur = changer une implémentation
derrière cette interface. Une journée de travail, zéro impact sur le reste.

---

## 6. Points d'extension prévus dès la V1

Ce sont les décisions qui coûtent quelques heures maintenant et évitent des semaines plus tard.

| Besoin futur                   | Ce qu'on prépare en V1                                                                   | Coût V1 |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ------- |
| Autres moyens de paiement      | Interface `PaymentProvider` — Pesapal n'est qu'une implémentation parmi d'autres         | ~4 h    |
| Multi-devises                  | Prix stockés en unités entières + devise ; taux figé au moment de la commande            | ~6 h    |
| Multi-langues                  | Tables `*_translations` créées dès le départ ; textes de l'interface externalisés        | ~8 h    |
| Multi-pays                     | Table `countries` (devise, langues, moyens de paiement, zones de livraison actives)      | ~4 h    |
| Dropshipping Sunsky            | Interface `SupplierAdapter` + champs `supplier_id`, `supplier_sku` sur les produits      | ~3 h    |
| **Marketplace multi-vendeurs** | Colonne `vendor_id` sur produits et lignes de commande, valeur par défaut « Beralshopp » | ~2 h    |
| Application mobile             | API `/api/v1` versionnée, documentée OpenAPI, authentification par jeton                 | ~6 h    |

Le dernier point mérite une insistance particulière : **ajouter `vendor_id` après coup dans une
base contenant des dizaines de milliers de commandes est un chantier de plusieurs semaines.**
Le faire maintenant coûte deux heures. C'est le meilleur rapport effort/valeur de tout ce document.

---

## 7. Authentification — écart assumé par rapport au plan initial

Ce dossier prévoyait **Auth.js v5**. Le lot 3 a été construit sur des **sessions en
base de données**. Voici pourquoi.

### Le problème avec Auth.js dans notre cas

Auth.js excelle pour les connexions via Google, Facebook ou Apple. Beralshopp
n'utilise aucune de ces options : l'identifiant est un **numéro de téléphone** avec
mot de passe. Or le fournisseur « Credentials » d'Auth.js impose des **sessions JWT**,
et refuse les sessions en base.

Un JWT est un jeton signé, autonome, que le serveur ne consulte nulle part. Sa
conséquence est irréductible : **il ne peut pas être révoqué**. Concrètement :

- un jeton volé reste valide jusqu'à son expiration, quoi qu'on fasse ;
- « déconnecter tous mes appareils » devient impossible ;
- désactiver un compte administrateur compromis ne prend effet qu'à l'expiration.

Pour une plateforme qui encaisse des paiements et dispose de comptes administrateurs,
c'est inacceptable.

### Ce qui a été fait à la place

| Élément         | Mise en œuvre                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mots de passe   | **Argon2id**, paramètres minimum OWASP 2024 (19 Mio, 2 itérations)                                                                                                       |
| Cookie          | Jeton aléatoire de 32 octets, `httpOnly` + `Secure` + `SameSite=Lax`                                                                                                     |
| Stockage        | **Seule l'empreinte SHA-256 du jeton** est en base — une fuite de la table `sessions` ne permet d'usurper aucune connexion                                               |
| Révocation      | Instantanée, unitaire ou globale. Les lignes sont conservées : trace d'audit                                                                                             |
| Durée           | 30 jours pour un client, **12 heures pour un administrateur**                                                                                                            |
| Non-énumération | Message ET temps de réponse identiques que le compte existe ou non                                                                                                       |
| Limitation      | 5 échecs par identifiant, 25 par adresse IP, sur 15 minutes glissantes — **comptés en base**, car un compteur en mémoire ne protège de rien sur un hébergement sans état |

### Ce que cela coûte

Une requête indexée supplémentaire par page authentifiée. C'est le prix de la
révocabilité, et il est modeste.

### Pour l'application mobile

Le même mécanisme s'applique : la table `sessions` sert aussi bien un cookie web
qu'un jeton `Bearer` mobile. Aucun second système d'authentification à construire.
