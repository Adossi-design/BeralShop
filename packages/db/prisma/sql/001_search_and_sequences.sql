-- ═══════════════════════════════════════════════════════════════════════════════
--  Objets PostgreSQL que Prisma ne sait pas décrire dans son schéma.
--
--  Ce fichier est destiné à être COLLÉ À LA FIN de la première migration générée
--  (prisma/migrations/<horodatage>_init/migration.sql), avant de l'appliquer.
--  Procédure détaillée dans packages/db/README.md.
--
--  Il est idempotent : le rejouer ne casse rien.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────── 1. Extensions de recherche ───────────────────────────

-- unaccent : « ecouteur » doit trouver « Écouteur ».
CREATE EXTENSION IF NOT EXISTS unaccent;

-- pg_trgm : tolérance aux fautes de frappe (« bluetoth » → « bluetooth »).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ──────────────────── 2. Configuration de recherche désaccentuée ────────────────────
-- `unaccent` n'est pas immutable par défaut, donc inutilisable dans une colonne
-- générée. On crée une configuration de recherche qui applique unaccent en amont
-- du stemming français : le résultat, lui, est déterministe.

DROP TEXT SEARCH CONFIGURATION IF EXISTS fr_unaccent CASCADE;
CREATE TEXT SEARCH CONFIGURATION fr_unaccent (COPY = french);

ALTER TEXT SEARCH CONFIGURATION fr_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, french_stem;

-- ─────────────────────── 3. Vecteur de recherche des produits ───────────────────────
-- La pondération A/B/C/D fait remonter un produit NOMMÉ « Écouteur Bluetooth » avant
-- un produit dont la description mentionne seulement « compatible Bluetooth ».
--
--   A → nom du produit (traduction française)
--   B → mots-clés et référence produit (SKU)
--   C → marque
--   D → description
--
-- Le vecteur est alimenté par trigger plutôt que par colonne générée : les données
-- proviennent de trois tables (products, product_translations, brands), ce qu'une
-- colonne `GENERATED ALWAYS AS` ne sait pas faire.

CREATE OR REPLACE FUNCTION beralshopp_refresh_product_search(p_product_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products p
     SET "searchVector" = (
       SELECT
         setweight(to_tsvector('fr_unaccent', coalesce(pt.name, '')),        'A') ||
         setweight(to_tsvector('fr_unaccent', coalesce(pt.keywords, '')),    'B') ||
         setweight(to_tsvector('simple',      coalesce(p.sku, '')),          'B') ||
         setweight(to_tsvector('fr_unaccent', coalesce(b.name, '')),         'C') ||
         setweight(to_tsvector('fr_unaccent', coalesce(pt.description, '')), 'D')
       FROM products p2
       LEFT JOIN product_translations pt
         ON pt."productId" = p2.id AND pt.locale = 'fr'
       LEFT JOIN brands b
         ON b.id = p2."brandId"
       WHERE p2.id = p.id
     )
   WHERE p.id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION beralshopp_trg_refresh_product_search()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_id text;
BEGIN
  -- ⚠️ Ces branches IF ne sont PAS un détail de style.
  --
  -- Une expression `CASE TG_TABLE_NAME WHEN 'products' THEN NEW.id
  --                 WHEN 'product_translations' THEN NEW."productId" END`
  -- constitue UNE SEULE instruction PL/pgSQL : PostgreSQL y résout tous les champs
  -- référencés, y compris ceux de la branche non empruntée. Un INSERT dans `products`
  -- échoue alors avec « record "new" has no field "productId" » (SQLSTATE 42703),
  -- ce qui rend toute création de produit impossible.
  --
  -- Les instructions PL/pgSQL étant préparées paresseusement, une par une, seule la
  -- branche réellement exécutée est compilée. D'où cette forme, plus verbeuse mais
  -- correcte. Ne pas « simplifier » en CASE.
  IF TG_TABLE_NAME = 'products' THEN
    IF TG_OP = 'DELETE' THEN
      target_id := OLD.id;
    ELSE
      target_id := NEW.id;
    END IF;
  ELSIF TG_TABLE_NAME = 'product_translations' THEN
    IF TG_OP = 'DELETE' THEN
      target_id := OLD."productId";
    ELSE
      target_id := NEW."productId";
    END IF;
  END IF;

  -- Le produit peut avoir été supprimé (suppression en cascade d'une traduction) :
  -- on ne recalcule que s'il existe encore.
  IF target_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM products WHERE id = target_id) THEN
    PERFORM beralshopp_refresh_product_search(target_id);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_search ON products;
CREATE TRIGGER trg_products_search
AFTER INSERT OR UPDATE OF sku, "brandId" ON products
FOR EACH ROW EXECUTE FUNCTION beralshopp_trg_refresh_product_search();

DROP TRIGGER IF EXISTS trg_product_translations_search ON product_translations;
CREATE TRIGGER trg_product_translations_search
AFTER INSERT OR UPDATE OR DELETE ON product_translations
FOR EACH ROW EXECUTE FUNCTION beralshopp_trg_refresh_product_search();

-- Index principal de la recherche plein texte.
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON products USING GIN ("searchVector");

-- Repêchage sur faute de frappe, quand la recherche exacte ne donne aucun résultat.
CREATE INDEX IF NOT EXISTS idx_product_translations_name_trgm
  ON product_translations USING GIN (name gin_trgm_ops);

-- ──────────────────────── 4. Séquence des numéros de commande ────────────────────────
-- BRL-2026-000123. L'unicité vient de la base, pas d'un tirage aléatoire côté
-- application : deux commandes simultanées ne peuvent pas obtenir le même numéro.

CREATE SEQUENCE IF NOT EXISTS beralshopp_order_number_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION beralshopp_next_order_number()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'BRL-'
      || to_char(now() AT TIME ZONE 'UTC', 'YYYY')
      || '-'
      || lpad(nextval('beralshopp_order_number_seq')::text, 6, '0');
$$;

-- ───────────────────── 5. Garde-fous d'intégrité (défense en profondeur) ─────────────────────
-- Ces contraintes doublent les vérifications applicatives. Un bug dans le code ne doit
-- jamais pouvoir produire un stock négatif ou un prix négatif en base.

ALTER TABLE product_variants
  DROP CONSTRAINT IF EXISTS chk_variant_stock_non_negative;
ALTER TABLE product_variants
  ADD CONSTRAINT chk_variant_stock_non_negative
  CHECK ("stockQuantity" >= 0 AND "reservedQuantity" >= 0);

-- On ne peut pas réserver plus que le stock physique disponible.
ALTER TABLE product_variants
  DROP CONSTRAINT IF EXISTS chk_variant_reserved_within_stock;
ALTER TABLE product_variants
  ADD CONSTRAINT chk_variant_reserved_within_stock
  CHECK ("reservedQuantity" <= "stockQuantity");

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS chk_product_price_non_negative;
ALTER TABLE products
  ADD CONSTRAINT chk_product_price_non_negative
  CHECK ("basePriceMinor" >= 0);

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS chk_order_totals_non_negative;
ALTER TABLE orders
  ADD CONSTRAINT chk_order_totals_non_negative
  CHECK ("subtotalMinor" >= 0 AND "shippingMinor" >= 0 AND "totalMinor" >= 0);

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS chk_order_item_quantity_positive;
ALTER TABLE order_items
  ADD CONSTRAINT chk_order_item_quantity_positive
  CHECK (quantity > 0);

ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS chk_cart_item_quantity_positive;
ALTER TABLE cart_items
  ADD CONSTRAINT chk_cart_item_quantity_positive
  CHECK (quantity > 0);

ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS chk_review_rating_range;
ALTER TABLE reviews
  ADD CONSTRAINT chk_review_rating_range
  CHECK (rating BETWEEN 1 AND 5);
