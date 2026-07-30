# @beralshopp/db

Schéma PostgreSQL, migrations et client Prisma.

## Mise en place initiale

```bash
# 1. Renseigner DATABASE_URL et DIRECT_URL dans .env.local à la racine du dépôt
cp .env.example .env.local

# 2. Générer le client
pnpm db:generate
```

## ⚠️ Première migration — procédure obligatoire

Le schéma Prisma ne décrit pas tout. Quatre familles d'objets PostgreSQL doivent être
ajoutées à la main, car Prisma ne sait pas les exprimer :

1. les extensions `unaccent` et `pg_trgm` (recherche insensible aux accents et aux fautes) ;
2. la configuration de recherche `fr_unaccent` et le vecteur `searchVector` avec ses triggers ;
3. la séquence des numéros de commande (`BRL-2026-000123`) ;
4. les contraintes `CHECK` qui rendent impossible un stock négatif ou une survente,
   **même en cas de bug applicatif**.

Tout cela vit dans [`prisma/sql/001_search_and_sequences.sql`](prisma/sql/001_search_and_sequences.sql).

**Procédure :**

```bash
# 1. Créer la migration SANS l'appliquer
pnpm --filter @beralshopp/db exec prisma migrate dev --name init --create-only

# 2. Coller le contenu de prisma/sql/001_search_and_sequences.sql
#    À LA FIN du fichier prisma/migrations/<horodatage>_init/migration.sql

# 3. Appliquer
pnpm db:migrate

# 4. Amorcer les devises, pays, vendeur et zones de livraison
pnpm db:seed

# 5. VÉRIFIER — ne pas sauter cette étape
pnpm db:verify
```

Sauter l'étape 2 produit une base qui fonctionne en apparence, mais dont la recherche ne
renvoie rien et dont les numéros de commande échouent. **Ne pas l'oublier.**

L'étape 5 crée un produit temporaire, cherche « ecouteur bluetooth » **sans accent**,
vérifie qu'il remonte, puis le supprime. C'est le seul contrôle qui prouve que la chaîne
complète fonctionne réellement.

## ⚠️ Piège PL/pgSQL à connaître

Le trigger de recherche utilise des branches `IF` et non une expression `CASE`. Ce n'est
pas un choix de style.

Une expression `CASE TG_TABLE_NAME WHEN 'products' THEN NEW.id WHEN 'product_translations'
THEN NEW."productId" END` forme **une seule instruction** PL/pgSQL : PostgreSQL y résout
tous les champs référencés, y compris ceux de la branche non empruntée. Un `INSERT` dans
`products` échoue alors avec :

```
SQLSTATE 42703 : record "new" has no field "productId"
```

Ce qui rend **toute création de produit impossible**. Pire : via Prisma, l'erreur remonte
sous la forme trompeuse « The column `(not available)` does not exist in the current
database », qui fait chercher du côté du schéma alors que le problème est dans le trigger.

Les instructions PL/pgSQL étant préparées paresseusement, une par une, seule la branche
réellement exécutée est compilée — d'où la forme `IF` / `ELSIF`, plus verbeuse mais
correcte. **Ne pas « simplifier » en `CASE`.**

## Commandes courantes

| Commande           | Effet                                                                             |
| ------------------ | --------------------------------------------------------------------------------- |
| `pnpm db:generate` | Régénère le client Prisma après modification du schéma                            |
| `pnpm db:migrate`  | Crée et applique une migration (développement)                                    |
| `pnpm db:push`     | Synchronise le schéma sans migration — **développement uniquement**               |
| `pnpm db:studio`   | Ouvre l'explorateur visuel de la base                                             |
| `pnpm db:seed`     | (Ré)applique les données de référence — idempotent                                |
| `pnpm db:verify`   | Contrôle de santé : extensions, triggers, séquence, contraintes, recherche réelle |

## Deux URL de connexion, et pourquoi

| Variable       | Usage          | Passe par le pooler ?                                                              |
| -------------- | -------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL` | L'application  | **Oui** — indispensable en serverless, où chaque requête peut ouvrir une connexion |
| `DIRECT_URL`   | Les migrations | **Non** — un pooler transactionnel casse les instructions DDL                      |

Mettre la même valeur dans les deux fonctionne… jusqu'à la première migration en
production, qui échoue de façon peu lisible. C'est une erreur classique.

## Règles du schéma

1. **Aucun prix en nombre à virgule.** Tout montant est un entier en plus petite unité
   (`...Minor`) accompagné de sa devise. `0.1 + 0.2` ne vaut pas `0.3` en informatique.
2. **Les commandes figent leurs données.** `OrderItem` copie le nom, le prix et l'image
   du produit. Modifier un produit ne doit jamais altérer une commande passée.
3. **Le panier ne stocke aucun prix.** Il est relu depuis `products` à chaque calcul :
   c'est la protection n°1 contre la fraude au prix.
4. **Les champs V2/V3 existent déjà** (`vendorId`, `supplierId`, tables de traduction,
   devises). Les ajouter plus tard sur une base en production coûterait des semaines.
