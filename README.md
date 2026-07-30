# Beralshopp

Plateforme e-commerce africaine — web responsive d'abord, application mobile ensuite.

Marché initial : 🇷🇼 Rwanda. Extension prévue : Tchad, Cameroun, Côte d'Ivoire, Sénégal, Bénin, RDC.

Développement assuré par Claude. **Propriétaire du code, des données et de tous les accès :
Adossi Fred William** — voir [06 — Sécurité & propriété](docs/06-securite-propriete.md).

---

## État du projet

**Boutique fonctionnelle de bout en bout, sauf l'encaissement.** Un client peut chercher un
produit, l'ajouter au panier, créer un compte et passer commande. L'administrateur gère les
commandes, les produits, les stocks et les clients depuis un seul tableau de bord.

| Lot | Contenu                                         | État                                 |
| --- | ----------------------------------------------- | ------------------------------------ |
| 0   | Monorepo, schéma de base, design system, CI     | ✅ Terminé                           |
| 1   | Catalogue : catégories, produits, fiche produit | ✅ Terminé                           |
| 2   | Recherche et filtres                            | ✅ Terminé                           |
| 3   | Comptes clients                                 | ✅ Terminé                           |
| 4   | Panier                                          | ✅ Terminé                           |
| 5   | Commande et suivi                               | ✅ Terminé                           |
| 6   | **Paiement Pesapal**                            | ⛔ Bloqué — accès bac à sable requis |
| 7   | Tableau de bord administrateur                  | ✅ Terminé                           |
| 8   | Design et performance                           | ⏳ À venir                           |
| 9   | Mise en ligne                                   | ⏳                                   |

Détail dans [05 — Roadmap](docs/05-roadmap.md).

---

## Démarrage

**Prérequis :** Node.js ≥ 22.13, pnpm ≥ 11, une base PostgreSQL 16.

```bash
# 1. Dépendances
pnpm install

# 2. Environnement — puis renseigner DATABASE_URL et DIRECT_URL
cp .env.example .env.local

# 3. Base de données (procédure complète : packages/db/README.md)
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 4. Lancer le site
pnpm dev          # → http://localhost:3000
```

> ⚠️ La première migration exige une étape manuelle documentée dans
> [packages/db/README.md](packages/db/README.md) : recherche plein texte, séquence des
> numéros de commande et contraintes anti-survente. La sauter donne une base qui semble
> fonctionner mais dont la recherche ne renvoie rien.

### Commandes

| Commande            | Effet                                                             |
| ------------------- | ----------------------------------------------------------------- |
| `pnpm dev`          | Serveur de développement                                          |
| `pnpm build`        | Build de production de tout le monorepo                           |
| `pnpm typecheck`    | Vérification des types                                            |
| `pnpm lint`         | Analyse statique                                                  |
| `pnpm test`         | Tests unitaires                                                   |
| `pnpm format`       | Reformatage du code                                               |
| `pnpm db:studio`    | Explorateur visuel de la base                                     |
| `pnpm db:verify`    | Contrôle de santé du schéma                                       |
| `pnpm db:reconcile` | Vérifie que les réservations de stock correspondent aux commandes |
| `pnpm db:admin`     | Crée ou promeut un compte administrateur                          |

---

## Structure

```
apps/
  web/                  Next.js 16 — site, API /api/v1, admin. AUCUNE logique métier.
packages/
  shared/               Devises, pays, machine à états, schémas de validation.
                        Consommé par le site ET par la future application mobile.
  db/                   Schéma Prisma, migrations, client, amorçage.
  core/                 Logique métier pure (à créer au lot 1).
```

**Règle d'architecture, non négociable :** une route API valide son entrée, appelle un
service métier, formate la réponse. Jamais de calcul de prix ni de requête SQL dans une
page. C'est ce qui permettra, le jour venu, d'extraire l'API dans un service dédié sans
réécriture. Voir [01 — Architecture technique](docs/01-architecture-technique.md).

---

## Trois règles à ne jamais enfreindre

1. **Aucun prix en nombre à virgule.** Tout montant est un entier en plus petite unité
   monétaire (`amountMinor`) accompagné de sa devise. En informatique `0.1 + 0.2` ne vaut
   pas `0.3` ; sur des milliers de commandes, cela crée des écarts de caisse irréconciliables.

2. **Le montant à payer est toujours recalculé sur le serveur.** La valeur envoyée par le
   navigateur n'est jamais utilisée. Le panier ne stocke aucun prix.

3. **Un paiement n'est jamais confirmé sur la foi d'un webhook.** Le serveur Beralshopp
   réinterroge Pesapal avec ses propres identifiants, et c'est cette réponse qui fait
   autorité. Voir [03 — Paiements & devises](docs/03-paiements-devises.md).

---

## Dossier technique

| Document                                                         | Contenu                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| [01 — Architecture technique](docs/01-architecture-technique.md) | Stack, structure du code, choix technologiques et justifications    |
| [02 — Modèle de données](docs/02-modele-de-donnees.md)           | Base de données, tables, index, recherche, gestion du stock         |
| [03 — Paiements & devises](docs/03-paiements-devises.md)         | Intégration Pesapal, architecture multi-prestataires, multi-devises |
| [04 — Hébergement & coûts](docs/04-hebergement-couts.md)         | Infrastructure, comparatif d'options, coûts mensuels estimés        |
| [05 — Roadmap](docs/05-roadmap.md)                               | Découpage V1 / V2 / V3, ordre de construction                       |
| [06 — Sécurité & propriété](docs/06-securite-propriete.md)       | Sécurité, conformité, propriété du code et des accès                |

---

## Note sur les versions

TypeScript est volontairement figé en **5.9**, alors que la 7.0 est disponible :
Next.js 16 ne fournit pas encore l'API de compilation requise par TypeScript 7.
À réévaluer lorsque Next l'annoncera — le gain est la vitesse de compilation, pas une
fonctionnalité manquante.
