-- Preuve du consentement aux conditions de vente et à la politique de
-- confidentialité.
--
-- POURQUOI CETTE MIGRATION EST ÉCRITE À LA MAIN
-- `prisma migrate dev` exige une base fantôme temporaire pour comparer les
-- schémas. Neon n'autorise pas sa création, et Prisma en conclut à tort qu'il
-- faut RÉINITIALISER la base — ce qui détruirait commandes, produits et comptes.
-- Sur une base unique servant aussi de production, les migrations se rédigent
-- donc à la main et s'appliquent avec `migrate deploy`.
--
-- Deux colonnes NULLABLES : l'opération n'entraîne ni réécriture de table ni
-- verrou long, et les comptes existants restent valides.

ALTER TABLE "users" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "termsVersion" VARCHAR(20);
