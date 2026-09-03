-- Une photo peut appartenir à une déclinaison précise (une couleur).
--
-- ÉCRITE À LA MAIN, appliquée avec « prisma migrate deploy ». La base de
-- développement de ce projet EST la base de production.
--
-- PUREMENT ADDITIVE : la colonne est nullable et vaut NULL pour toutes les
-- photos existantes, qui restent donc communes au produit et continuent de
-- s'afficher exactement comme avant. Aucune donnée n'est modifiée.

ALTER TABLE "product_images" ADD COLUMN "variantId" TEXT;

CREATE INDEX "product_images_variantId_idx" ON "product_images"("variantId");

-- ON DELETE SET NULL : retirer une couleur ne détruit pas ses photos, elles
-- redeviennent communes. Un CASCADE effacerait des fichiers de façon
-- irréversible pour une opération qui, elle, ne l'est pas.
ALTER TABLE "product_images"
    ADD CONSTRAINT "product_images_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "product_variants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
