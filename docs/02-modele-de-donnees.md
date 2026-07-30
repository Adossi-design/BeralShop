# 02 — Modèle de données

Base : **PostgreSQL 16**. Accès via **Prisma**, migrations versionnées dans Git.

---

## 1. Schéma principal (V1)

### Catalogue

```
categories
  id, slug (unique), parent_id (arborescence), position, image_url, is_active
  → traductions dans category_translations (locale, name, description)

brands
  id, slug, name, logo_url

products
  id
  sku                     référence produit, unique, recherchable
  slug                    unique, pour l'URL
  category_id, brand_id
  vendor_id               ⚠ V1 : toujours « Beralshop ». Prépare la marketplace V3.
  supplier_id             null en V1. Prépare Sunsky/dropshipping V3.
  supplier_sku            référence chez le fournisseur
  base_price_minor        INT — prix en unités entières, devise de référence (RWF)
  compare_at_price_minor  INT — « ancien prix » barré si promotion
  currency                'RWF'
  status                  BROUILLON | ACTIF | ARCHIVE
  is_featured             mis en avant sur l'accueil
  sales_count             dénormalisé, pour le tri « meilleures ventes »
  rating_avg, rating_count  dénormalisés, pour l'affichage des avis
  search_vector           tsvector généré automatiquement (voir §3)
  created_at, updated_at

product_translations
  product_id, locale ('fr'|'en'|'ar'), name, description, specifications (JSONB), keywords
  → clé primaire (product_id, locale)

product_images
  id, product_id, url, alt_text, position, is_primary

product_variants           ex. Couleur = Noir, Taille = M
  id, product_id, sku (unique)
  options                  JSONB — { "couleur": "Noir", "taille": "M" }
  price_delta_minor        INT — écart de prix par rapport au produit de base
  stock_quantity           INT
  reserved_quantity        INT — réservé par des commandes non encore payées
  is_active
```

> **Note sur les variantes :** même un produit sans option a une variante par défaut. Cela
> évite deux chemins de code différents pour le stock et le panier. Simplification majeure.

### Clients

```
users
  id
  phone                   unique, format E.164 (+250...) — identifiant principal en Afrique
  email                   unique, nullable
  password_hash           Argon2id
  full_name
  locale, preferred_currency, country_code
  phone_verified_at, email_verified_at
  role                    CLIENT | ADMIN | SUPPORT
  is_active
  created_at, last_login_at

addresses
  id, user_id, label ('Domicile', 'Bureau')
  recipient_name, phone
  country_code, province, district, sector, street_line, landmark
  ⚠ Champs adaptés à l'adressage rwandais (province/district/secteur/point de repère),
    pas au modèle occidental « rue + code postal » qui ne fonctionne pas ici.
  latitude, longitude     nullable — pour la livraison
  is_default_shipping
```

### Panier & commandes

```
carts
  id, user_id (nullable), session_token (visiteur non connecté), currency, expires_at

cart_items
  id, cart_id, variant_id, quantity
  ⚠ AUCUN prix stocké ici. Le prix est toujours relu depuis products au moment du calcul.

orders
  id
  order_number            unique, lisible : BRL-2026-000123
  user_id
  status                  voir §2
  currency_display        devise choisie par le client (ex. 'XAF')
  currency_settlement     devise réellement encaissée (ex. 'RWF')
  fx_rate_used            DECIMAL(18,8) — taux FIGÉ à la création. Le total ne bouge plus.
  subtotal_minor, shipping_minor, discount_minor, tax_minor, total_minor
  shipping_address        JSONB — copie figée de l'adresse (elle peut changer après coup)
  contact_phone, contact_email
  tracking_number, carrier_name       ajoutés par l'admin
  notes_customer, notes_internal
  placed_at, paid_at, shipped_at, delivered_at, cancelled_at

order_items
  id, order_id, variant_id, vendor_id
  product_name_snapshot, variant_options_snapshot, image_url_snapshot
  unit_price_minor, quantity, line_total_minor
  ⚠ Copie figée du produit. Si tu changes le prix ou supprimes le produit demain,
    les commandes passées restent exactes. Indispensable en comptabilité.

order_events                journal d'audit, une ligne par changement
  id, order_id, from_status, to_status, actor_type (CLIENT|ADMIN|SYSTEME|WEBHOOK),
  actor_id, payload JSONB, created_at
```

### Paiements

```
payments
  id
  order_id
  provider                'pesapal' | 'flutterwave' | ...
  provider_reference      OrderTrackingId côté Pesapal
  merchant_reference      notre référence envoyée au prestataire
  idempotency_key         unique — empêche tout double débit
  amount_minor, currency
  status                  INITIE | EN_ATTENTE | REUSSI | ECHOUE | ANNULE | REMBOURSE
  method_detail           'MTN MoMo' | 'Airtel Money' | 'VISA' | ...
  raw_response            JSONB — réponse brute du prestataire, conservée telle quelle
  created_at, completed_at

payment_events              journal immuable de tous les échanges avec le prestataire
  id, payment_id, event_type, payload JSONB, received_at

refunds
  id, payment_id, amount_minor, reason, status, provider_reference, created_by, created_at
```

### Devises & pays

```
countries
  code ('RW','TD','CM','CI','SN','BJ','CD'), name, default_currency, default_locale,
  is_shipping_enabled, is_selling_enabled, enabled_payment_providers (JSONB)

currencies
  code ('RWF','XAF','XOF','USD','EUR')
  minor_unit_exponent     ⚠ RWF/XAF/XOF = 0 décimale | USD/EUR = 2 décimales
  symbol, symbol_position, rounding_rule

fx_rates
  id, base_currency, quote_currency, rate DECIMAL(18,8), source, fetched_at, valid_until
```

### Divers V1

```
shipping_zones      pays/région → tarif, délai estimé, seuil de franchise de port
promotions          code, type (%|montant|port offert), valeur, dates, plafonds, conditions
reviews             product_id, user_id, order_id, note 1-5, commentaire, statut modération
notifications       user_id, canal, modèle, statut, tentatives, envoyé_le
admin_audit_log     qui a modifié quoi, quand, ancienne et nouvelle valeur
```

---

## 2. Machine à états de la commande

Les transitions sont **contrôlées par le code**, pas par un champ libre. Une transition
interdite lève une erreur — impossible de passer une commande de « Reçue » à « Livrée »
en sautant le paiement.

```
                  ┌──────────────────┐
                  │ EN_ATTENTE_PAIEMENT │ ◄── création de la commande
                  └────────┬─────────┘
              ┌────────────┼────────────┬──────────────┐
              ▼            ▼            ▼              ▼
        PAIEMENT_ECHOUE  ANNULEE   EXPIREE          PAYEE
              │                                       │
              └──► (le client peut recommencer)       ▼
                                                 EN_PREPARATION
                                                      │
                                                      ▼
                                                  EXPEDIEE  ── + n° de suivi
                                                      │
                                                      ▼
                                                EN_LIVRAISON
                                                      │
                                                      ▼
                                                   LIVREE
                                                      │
                                                      ▼
                                             REMBOURSEE (partiel ou total)
```

Chaque transition écrit dans `order_events` **et** déclenche la notification correspondante
(§ document 05). C'est le suivi de commande que verra le client.

---

## 3. Recherche — implémentation

Colonne `tsvector` sur `products`, recalculée automatiquement à chaque modification.

**Implémentée par trigger, et non par colonne générée** : les données du vecteur
proviennent de trois tables (`products`, `product_translations`, `brands`), ce qu'une
colonne `GENERATED ALWAYS AS` ne sait pas faire — elle ne peut lire que sa propre ligne.

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- `unaccent` n'étant pas immutable, on l'intègre à une configuration de recherche
-- dédiée : le résultat devient déterministe et indexable.
CREATE TEXT SEARCH CONFIGURATION fr_unaccent (COPY = french);
ALTER TEXT SEARCH CONFIGURATION fr_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, french_stem;

-- Vecteur pondéré : le nom compte plus que la description
--   A → nom du produit    B → mots-clés et référence
--   C → marque            D → description
-- (fonction + triggers complets : packages/db/prisma/sql/001_search_and_sequences.sql)

CREATE INDEX idx_products_search_vector ON products USING GIN ("searchVector");
CREATE INDEX idx_product_translations_name_trgm
  ON product_translations USING GIN (name gin_trgm_ops);
```

> ⚠️ **Piège rencontré et documenté.** Le trigger doit utiliser des branches `IF` et non
> une expression `CASE` : une expression `CASE` unique est compilée d'un bloc et
> PostgreSQL y résout les champs de _toutes_ les branches, y compris celle qui n'est pas
> empruntée. Résultat : `record "new" has no field "productId"` (SQLSTATE 42703) à chaque
> création de produit. Détails dans [packages/db/README.md](../packages/db/README.md).

- `unaccent` → « ecouteur bluetooth » trouve « Écouteur Bluetooth »
- pondération A/B/C/D → un produit nommé « Écouteur Bluetooth » sort avant un produit dont
  la description mentionne « compatible Bluetooth »
- `pg_trgm` → repêchage sur faute de frappe quand la recherche exacte ne donne rien

**Index de performance obligatoires dès le départ :**

```sql
CREATE INDEX ON products (category_id, status, created_at DESC);
CREATE INDEX ON products (status, sales_count DESC);          -- meilleures ventes
CREATE INDEX ON products (status, base_price_minor);          -- filtre prix
CREATE INDEX ON products (status, is_featured) WHERE is_featured;
CREATE INDEX ON orders (user_id, placed_at DESC);
CREATE INDEX ON orders (status, placed_at DESC);              -- tableau de bord admin
CREATE INDEX ON order_items (order_id);
CREATE INDEX ON payments (order_id);
CREATE INDEX ON payments (provider, provider_reference);      -- traitement des webhooks
```

**Pagination par curseur** (`WHERE created_at < :curseur LIMIT 24`) et non `OFFSET`.
Avec `OFFSET`, la page 500 d'un catalogue de 50 000 produits met plusieurs secondes ;
avec un curseur, elle reste aussi rapide que la page 1.

---

## 4. Stock : ne jamais vendre ce qu'on n'a pas

Le problème classique : deux clients achètent simultanément le dernier article. Sans
protection, les deux commandes passent, un client est déçu et il faut rembourser.

**Solution — réservation transactionnelle :**

```
1. Création de la commande (statut EN_ATTENTE_PAIEMENT)
   → dans UNE transaction SQL :
       UPDATE product_variants
          SET reserved_quantity = reserved_quantity + :qte
        WHERE id = :variant_id
          AND stock_quantity - reserved_quantity >= :qte;   ← condition atomique
       Si 0 ligne modifiée → stock insuffisant → commande refusée proprement.

2. Paiement confirmé
   → stock_quantity -= qte ; reserved_quantity -= qte

3. Paiement échoué, annulé, ou délai de 30 minutes dépassé
   → reserved_quantity -= qte  (tâche de fond automatique)
```

Le stock affiché au client est `stock_quantity - reserved_quantity`.
Aucune sur-vente possible, même sous forte charge simultanée.

---

## 5. Prix : entiers uniquement, jamais de décimaux

**Règle absolue : aucun prix n'est stocké en nombre à virgule flottante.**
En informatique, `0.1 + 0.2` ne vaut pas exactement `0.3`. Sur des milliers de commandes,
cela produit des écarts de caisse impossibles à réconcilier.

Tous les montants sont des **entiers en plus petite unité monétaire**, avec la devise :

| Devise    | Exposant | 1 500 en base signifie |
| --------- | -------- | ---------------------- |
| RWF       | 0        | 1 500 Frw              |
| XAF / XOF | 0        | 1 500 FCFA             |
| USD       | 2        | 15,00 $                |
| EUR       | 2        | 15,00 €                |

L'affichage applique l'exposant au dernier moment. C'est la norme de toute l'industrie du
paiement — Pesapal, Stripe et les banques fonctionnent ainsi.

---

## 6. Sauvegardes

- **Sauvegarde automatique quotidienne**, conservation 30 jours
- **Restauration à un instant précis** (PITR) sur 7 jours — permet de revenir à 14 h 32
  la veille si une manipulation admin a supprimé des données
- **Test de restauration trimestriel** : une sauvegarde jamais testée n'est pas une sauvegarde
- Export mensuel `pg_dump` chiffré, stocké **hors du fournisseur d'hébergement** (ton propre
  compte Google Drive ou R2) — protection contre la perte d'accès au fournisseur lui-même
