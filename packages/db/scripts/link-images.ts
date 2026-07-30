// ⚠️ Doit rester le tout premier import.
import '../src/load-env.ts';

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

import { prisma } from '../src/client.ts';

/**
 * Relie les photos déposées dans `photos-produits/` aux produits en base.
 *
 * Convention : le fichier commence par le SKU du produit, suivi d'un numéro
 * d'ordre — `ELEC-CAM-Q8-1.jpg`, `ELEC-CAM-Q8-2.jpg`… Voir photos-produits/LISEZ-MOI.md.
 *
 * Idempotent : relancer remplace les images du produit, ne les duplique pas.
 * Seuls les produits ayant AU MOINS un fichier déposé sont touchés — on ne
 * supprime jamais les images d'un produit dont les photos n'ont pas été déposées.
 */

const RACINE = resolve(import.meta.dirname, '../../..');
const DEPOT = join(RACINE, 'photos-produits');
const PUBLIC_DIR = join(RACINE, 'apps', 'web', 'public', 'images', 'produits');
/** URL publique correspondant à PUBLIC_DIR — servie telle quelle par Next. */
const URL_BASE = '/images/produits';

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

interface Depot {
  readonly fichier: string;
  readonly ordre: number;
}

function analyserNom(nom: string): { cle: string; ordre: number } | null {
  const ext = extname(nom).toLowerCase();
  if (!EXTENSIONS.has(ext)) return null;

  const sansExt = basename(nom, extname(nom));
  // « ELEC-CAM-Q8-2 » → SKU « ELEC-CAM-Q8 », ordre 2. Sans numéro final, ordre 1.
  const m = /^(.*?)[-_](\d+)$/.exec(sansExt);
  const sku = (m ? m[1]! : sansExt).toUpperCase();
  const ordre = m ? Number(m[2]) : 1;
  return { cle: sku, ordre };
}

if (!existsSync(DEPOT)) {
  console.error(`Le dossier de dépôt n'existe pas : ${DEPOT}`);
  process.exit(1);
}

// 1. Inventaire du dépôt, groupé par SKU.
const parSku = new Map<string, Depot[]>();
for (const fichier of readdirSync(DEPOT)) {
  const info = analyserNom(fichier);
  if (!info) continue;
  const liste = parSku.get(info.cle) ?? [];
  liste.push({ fichier, ordre: info.ordre });
  parSku.set(info.cle, liste);
}

if (parSku.size === 0) {
  console.log(`Aucune photo trouvée dans ${DEPOT}.`);
  console.log('Nommage attendu : SKU-1.jpg, SKU-2.jpg… (voir LISEZ-MOI.md dans ce dossier).');
  process.exit(0);
}

// 2. Rapprochement avec les produits.
const produits = await prisma.product.findMany({
  select: { id: true, sku: true, translations: { select: { name: true, locale: true } } },
});
const produitParSku = new Map(produits.map((p) => [p.sku.toUpperCase(), p]));

mkdirSync(PUBLIC_DIR, { recursive: true });

let totalImages = 0;
const orphelins: string[] = [];

for (const [sku, fichiers] of [...parSku.entries()].sort()) {
  const produit = produitParSku.get(sku);
  if (!produit) {
    orphelins.push(...fichiers.map((f) => f.fichier));
    continue;
  }

  fichiers.sort((a, b) => a.ordre - b.ordre);
  const nom =
    produit.translations.find((t) => t.locale === 'fr')?.name ??
    produit.translations[0]?.name ??
    produit.sku;

  // Remplacement atomique côté base : anciennes lignes supprimées puis recréées
  // dans une transaction — jamais d'état intermédiaire sans image principale.
  const lignes = fichiers.map((f, index) => {
    const ext = extname(f.fichier).toLowerCase();
    const nomPublic = `${sku.toLowerCase()}-${index + 1}${ext}`;
    copyFileSync(join(DEPOT, f.fichier), join(PUBLIC_DIR, nomPublic));
    return {
      productId: produit.id,
      url: `${URL_BASE}/${nomPublic}`,
      altText: index === 0 ? nom : `${nom} — vue ${index + 1}`,
      position: index,
      isPrimary: index === 0,
    };
  });

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: produit.id } }),
    prisma.productImage.createMany({ data: lignes }),
  ]);

  totalImages += lignes.length;
  console.log(`✓ ${produit.sku} — ${lignes.length} image(s)`);
}

if (orphelins.length > 0) {
  console.log('\n⚠ Fichiers ignorés (aucun produit ne porte ce SKU) :');
  for (const f of orphelins) console.log(`  ${f}`);
  console.log('  Vérifie la référence dans /admin/produits.');
}

console.log(`\n${totalImages} image(s) reliée(s). Les pages se mettent à jour sous 5 minutes.`);
await prisma.$disconnect();
