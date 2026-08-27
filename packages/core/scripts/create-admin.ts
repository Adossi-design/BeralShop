import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import '../../db/src/load-env.ts';

import { hashPassword } from '../src/auth/password.ts';

import { prisma } from '@beralshopp/db';

import { demanderMotDePasse } from './saisie-masquee.ts';

/**
 * Création ou promotion d'un compte administrateur.
 *
 * Volontairement en ligne de commande, et non depuis une page web : un formulaire
 * « créer un administrateur » accessible sur Internet est une porte d'entrée, même
 * protégé. Ici, il faut un accès au serveur et à la base.
 *
 *   pnpm db:admin                          → mode interactif
 *   pnpm db:admin -- +250788123456         → promeut un compte existant
 *
 * Le mot de passe n'est jamais passé en argument : il resterait dans l'historique
 * du terminal.
 */

async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const argPhone = process.argv[2];
    const phone = (argPhone ?? (await rl.question('Numéro de téléphone (+250…) : '))).trim();

    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      console.error('\n✖ Numéro invalide. Format international attendu : +250788123456\n');
      process.exitCode = 1;
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, fullName: true, role: true },
    });

    if (existing) {
      if (existing.role === 'ADMIN') {
        console.log(`\n· ${existing.fullName} est déjà administrateur.\n`);
        return;
      }

      await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
      console.log(`\n✔ ${existing.fullName} est maintenant ADMINISTRATEUR.`);
      console.log('  Ses sessions en cours ont été révoquées : reconnexion nécessaire.\n');

      // Une session ouverte avant la promotion garderait une durée de 30 jours,
      // alors qu'un compte à privilèges expire en 12 heures.
      await prisma.session.updateMany({
        where: { userId: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }

    console.log('\nAucun compte avec ce numéro. Création d’un administrateur.\n');
    const fullName = (await rl.question('Nom complet : ')).trim();
    const email = (await rl.question('E-mail (facultatif) : ')).trim();

    // On ferme l'interface avant la saisie masquée : `readline` retient l'entrée
    // standard, et le mode brut ne peut pas s'installer par-dessus.
    rl.close();
    const password = (await demanderMotDePasse('Mot de passe (min. 8 caractères) : ')).trim();

    if (fullName.length < 2 || password.length < 8) {
      console.error('\n✖ Nom trop court ou mot de passe de moins de 8 caractères.\n');
      process.exitCode = 1;
      return;
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        phone,
        email: email || null,
        passwordHash: await hashPassword(password),
        role: 'ADMIN',
        countryCode: 'RW',
        phoneVerifiedAt: new Date(),
      },
      select: { id: true },
    });

    console.log(`\n✔ Administrateur créé (${user.id}).`);
    console.log('  Connexion : /connexion, puis tableau de bord : /admin\n');
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('\n✖ Échec :\n', error);
  process.exitCode = 1;
});
