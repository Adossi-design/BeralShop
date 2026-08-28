// ⚠️ Doit rester le tout premier import.
import '../../db/src/load-env.ts';

import { prisma } from '@beralshopp/db';

import { registerAccount } from '../src/auth/account-service.ts';
import { exporterDonneesPersonnelles, supprimerCompte } from '../src/auth/personal-data.ts';

/**
 * Contrôle des droits du client sur ses données : export et effacement.
 *
 * Ces deux fonctions détruisent des données. Les vérifier « à l'œil » sur la
 * boutique reviendrait à supprimer un vrai compte pour voir ce qui se passe.
 * Ce script fabrique donc son propre client, lui crée une adresse et une
 * commande, exerce les deux droits, puis vérifie CE QUI RESTE RÉELLEMENT en base.
 *
 *     pnpm donnees:smoke
 *
 * Il nettoie derrière lui, y compris en cas d'échec.
 */

let echecs = 0;

function ok(label: string, detail = ''): void {
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
}
function ko(label: string, detail: string): void {
  echecs += 1;
  console.error(`  ✖ ${label} — ${detail}`);
}
function verifier(condition: boolean, label: string, detail = ''): void {
  if (condition) ok(label, detail);
  else ko(label, detail || 'condition non remplie');
}

/** Numéro hors plage réelle : aucun risque de heurter un vrai client. */
const TELEPHONE = '+250799000042';
const MOT_DE_PASSE = 'Kigali-Essai-2026!';

async function nettoyer(): Promise<void> {
  const reste = await prisma.user.findUnique({ where: { phone: TELEPHONE } });
  if (reste) {
    await prisma.order.deleteMany({ where: { userId: reste.id } });
    await prisma.user.delete({ where: { id: reste.id } });
  }
  // Commandes anonymisées laissées par une exécution précédente.
  await prisma.order.deleteMany({ where: { customerNote: 'COMMANDE DE TEST — DONNEES' } });
}

async function main(): Promise<void> {
  console.log('\n▶ Droits sur les données personnelles\n');
  await nettoyer();

  // ——— Préparation d'un client complet ———
  const inscription = await registerAccount(
    {
      fullName: 'Client Essai',
      phone: TELEPHONE,
      email: 'essai-donnees@example.test',
      password: MOT_DE_PASSE,
    },
    { userAgent: 'script-de-controle', ipAddress: '203.0.113.7' },
  );
  if (!inscription.ok) throw new Error(`inscription impossible : ${JSON.stringify(inscription)}`);
  const userId = inscription.userId;

  console.log('Préparation :');
  ok('Compte de test créé');

  const consentement = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { termsAcceptedAt: true, termsVersion: true },
  });
  verifier(
    consentement.termsAcceptedAt !== null && consentement.termsVersion !== null,
    'Consentement horodaté et versionné',
    consentement.termsVersion ?? 'absent',
  );

  await prisma.address.create({
    data: {
      userId,
      countryCode: 'RW',
      recipientName: 'Client Essai',
      phone: TELEPHONE,
      province: 'Kigali',
      district: 'Gasabo',
      sector: 'Remera',
    },
  });
  ok('Adresse enregistrée');

  const commande = await prisma.order.create({
    data: {
      user: { connect: { id: userId } },
      orderNumber: `TEST-${Date.now()}`,
      status: 'PAID',
      currencyDisplay: 'RWF',
      currencySettlement: 'RWF',
      subtotalMinor: 10000,
      shippingMinor: 0,
      totalMinor: 10000,
      shippingAddress: { recipientName: 'Client Essai', province: 'Kigali', sector: 'Remera' },
      contactPhone: TELEPHONE,
      contactEmail: 'essai-donnees@example.test',
      customerNote: 'COMMANDE DE TEST — DONNEES',
    },
    select: { id: true },
  });
  ok('Commande créée');

  // ——— Droit d'accès : l'export ———
  console.log('\nExport :');
  const donnees = (await exporterDonneesPersonnelles(userId)) as {
    compte: Record<string, unknown> & { orders: unknown[]; addresses: unknown[] };
  };
  const brut = JSON.stringify(donnees);

  verifier(brut.includes('Client Essai'), 'Contient le nom réel');
  verifier(brut.includes(TELEPHONE), 'Contient le téléphone réel');
  verifier(
    donnees.compte.orders.length === 1,
    'Contient la commande',
    `${donnees.compte.orders.length}`,
  );
  verifier(donnees.compte.addresses.length === 1, 'Contient l’adresse');
  verifier(!brut.includes('passwordHash'), 'N’expose PAS le condensé du mot de passe');
  verifier(!brut.includes('totpSecret'), 'N’expose PAS le secret de double authentification');

  // ——— Droit d'effacement ———
  console.log('\nEffacement :');
  const refus = await supprimerCompte(userId, 'mauvais-mot-de-passe');
  verifier(!refus.ok, 'Refusé avec un mauvais mot de passe');

  const toujoursLa = await prisma.user.findUnique({ where: { id: userId } });
  verifier(toujoursLa !== null, 'Le compte survit à une tentative refusée');

  const resultat = await supprimerCompte(userId, MOT_DE_PASSE);
  verifier(resultat.ok, 'Accepté avec le bon mot de passe');

  console.log('\nCe qui reste en base :');
  verifier((await prisma.user.findUnique({ where: { id: userId } })) === null, 'Compte supprimé');
  verifier((await prisma.address.count({ where: { userId } })) === 0, 'Adresses supprimées');
  verifier((await prisma.session.count({ where: { userId } })) === 0, 'Sessions supprimées');
  verifier((await prisma.cart.count({ where: { userId } })) === 0, 'Paniers supprimés');

  const apres = await prisma.order.findUnique({
    where: { id: commande.id },
    select: {
      userId: true,
      contactPhone: true,
      contactEmail: true,
      customerNote: true,
      shippingAddress: true,
      totalMinor: true,
      status: true,
    },
  });

  verifier(apres !== null, 'Commande CONSERVÉE (pièce comptable)');
  verifier(apres?.totalMinor === 10000, 'Montant intact', String(apres?.totalMinor));
  verifier(apres?.status === 'PAID', 'Statut intact');
  verifier(apres?.userId === null, 'Commande détachée du compte');
  verifier(apres?.contactPhone !== TELEPHONE, 'Téléphone effacé', String(apres?.contactPhone));
  verifier(apres?.contactEmail === null, 'E-mail effacé');
  verifier(apres?.customerNote === null, 'Note du client effacée');

  const adresseApres = JSON.stringify(apres?.shippingAddress ?? {});
  verifier(!adresseApres.includes('Client Essai'), 'Nom absent de l’adresse de livraison');
  verifier(!adresseApres.includes('Remera'), 'Adresse de livraison effacée');

  // Contrôle final : plus AUCUNE trace du client dans la commande.
  const trace = JSON.stringify(apres);
  verifier(
    !trace.includes('Client Essai') &&
      !trace.includes(TELEPHONE) &&
      !trace.includes('example.test'),
    'Plus aucune donnée identifiante dans la commande',
  );

  await prisma.order.delete({ where: { id: commande.id } });
}

main()
  .catch((error: unknown) => {
    echecs += 1;
    console.error('\n✖ Échec :', error);
  })
  .finally(async () => {
    await nettoyer().catch(() => undefined);
    console.log(
      echecs === 0
        ? '\n✔ Droits sur les données conformes\n'
        : `\n✖ ${echecs} contrôle(s) en échec\n`,
    );
    process.exitCode = echecs === 0 ? 0 : 1;
    await prisma.$disconnect();
  });
