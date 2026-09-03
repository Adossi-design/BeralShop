-- Prix dégressifs selon la quantité commandée.
--
-- ÉCRITE À LA MAIN, et appliquée avec « prisma migrate deploy ».
-- La base de développement de ce projet EST la base de production : « migrate dev »
-- réclamerait une base fantôme que Neon n'accorde pas, et proposerait de tout
-- réinitialiser. Aucune donnée existante n'est touchée ici — on ne fait qu'ajouter
-- une table.

CREATE TABLE "product_price_tiers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_tiers_pkey" PRIMARY KEY ("id")
);

-- Un seul prix par seuil : deux lignes « 10 pièces » rendraient le calcul
-- dépendant de l'ordre de lecture.
CREATE UNIQUE INDEX "product_price_tiers_productId_minQuantity_key"
    ON "product_price_tiers"("productId", "minQuantity");

CREATE INDEX "product_price_tiers_productId_idx"
    ON "product_price_tiers"("productId");

-- ON DELETE CASCADE : les paliers n'ont aucun sens sans leur produit.
ALTER TABLE "product_price_tiers"
    ADD CONSTRAINT "product_price_tiers_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
