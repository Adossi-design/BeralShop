import type { Metadata } from 'next';
import Link from 'next/link';

import { DraftNotice, Section, StaticPage } from '@/components/static-page';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Quelles données Beralshopp collecte, pourquoi, combien de temps, et quels sont ' +
    'vos droits.',
  alternates: { canonical: '/confidentialite' },
};

/**
 * ⚠️ BROUILLON DE TRAVAIL.
 *
 * Le Rwanda dispose d'une loi sur la protection des données personnelles (2021) qui
 * impose notamment l'enregistrement des responsables de traitement auprès de la NCSA.
 * Cette démarche est administrative et doit être menée avant l'ouverture commerciale.
 *
 * Le contenu ci-dessous décrit fidèlement ce que la plateforme fait RÉELLEMENT —
 * il n'a pas été rédigé à partir d'un modèle générique. C'est ce qui le rend utile
 * comme base de discussion avec un juriste.
 */
export default function PrivacyPage() {
  return (
    <StaticPage
      title="Politique de confidentialité"
      intro="Ce que nous collectons, pourquoi, et ce que nous ne faisons pas."
    >
      <DraftNotice>
        <strong>Document en cours de validation.</strong> Le Rwanda impose l’enregistrement des
        responsables de traitement auprès de la NCSA. Cette démarche, ainsi que la relecture
        juridique de ce texte, doivent être effectuées avant l’ouverture commerciale.
      </DraftNotice>

      <Section title="Ce que nous collectons">
        <p>
          <strong className="text-content">Pour créer un compte :</strong> votre nom, votre numéro
          de téléphone et, si vous le souhaitez, votre adresse e-mail. Le mot de passe est stocké
          sous forme chiffrée irréversible — nous ne pouvons pas le lire.
        </p>
        <p>
          <strong className="text-content">Pour livrer une commande :</strong> l’adresse de
          livraison, le nom du destinataire et un numéro de téléphone joignable.
        </p>
        <p>
          <strong className="text-content">Techniquement :</strong> l’adresse IP et le type de
          navigateur lors des connexions, afin de détecter les tentatives d’accès frauduleuses et de
          vous permettre de vérifier vos appareils connectés.
        </p>
      </Section>

      <Section title="Ce que nous ne collectons pas">
        <p>
          <strong className="text-content">Aucune donnée bancaire.</strong> Le numéro de carte et le
          code Mobile Money sont saisis sur la page sécurisée de notre prestataire de paiement. Ils
          ne transitent jamais par nos serveurs et n’y sont jamais stockés.
        </p>
      </Section>

      <Section title="Pourquoi nous les utilisons">
        <p>
          Exclusivement pour traiter vos commandes, vous livrer, vous informer de l’état de votre
          commande, et sécuriser votre compte. Nous ne vendons ni ne louons vos données à des tiers.
        </p>
        <p>
          Vos informations sont transmises uniquement aux prestataires nécessaires à l’exécution de
          la commande : le prestataire de paiement et le transporteur, chacun limité aux données
          dont il a besoin.
        </p>
      </Section>

      <Section title="Combien de temps">
        <p>
          Les données de compte sont conservées tant que le compte existe. Les commandes sont
          conservées plus longtemps pour répondre aux obligations comptables et fiscales, même après
          suppression du compte — elles sont alors dissociées de votre identité dans la mesure du
          possible.
        </p>
      </Section>

      <Section title="Vos droits">
        <p>
          Vous pouvez consulter et modifier vos informations depuis votre{' '}
          <Link href="/compte" className="text-gold-700 underline">
            espace client
          </Link>
          . Vous pouvez également demander la suppression de votre compte, l’accès à vos données ou
          leur rectification en nous{' '}
          <Link href="/contact" className="text-gold-700 underline">
            contactant
          </Link>
          .
        </p>
      </Section>

      <Section title="Sécurité">
        <p>
          Les échanges avec le site sont chiffrés. Les mots de passe sont protégés par un algorithme
          conçu pour résister aux attaques par force brute. Les sessions de connexion sont
          révocables : vous pouvez déconnecter à distance un appareil depuis la section Sécurité de
          votre espace client.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Nous utilisons uniquement des cookies nécessaires au fonctionnement : celui qui maintient
          votre session ouverte, et celui qui conserve votre panier si vous n’êtes pas connecté.
          Aucun cookie publicitaire ni de traçage tiers n’est déposé.
        </p>
      </Section>
    </StaticPage>
  );
}
