# 05 — Roadmap de construction

> Le développement est réalisé par Claude, en sessions de travail successives.
> Le rythme réel dépend surtout de **trois facteurs qui dépendent de toi** :
> tes validations à chaque lot, la fourniture du contenu (photos, fiches produits),
> et l'obtention des accès Pesapal (bac à sable puis production).

---

## Ordre de construction — pourquoi celui-ci

On ne construit pas dans l'ordre de la liste de tes besoins, mais dans l'ordre des
**dépendances techniques**. Chaque lot rend le suivant possible et laisse le projet dans un
état fonctionnel et testable. Pas de « grand tout » qui ne marche qu'à la fin.

```
Lot 0  Fondations ─────┐
Lot 1  Catalogue ──────┼──► Lot 2  Recherche
                       │
Lot 3  Comptes ────────┼──► Lot 4  Panier ──► Lot 5  Commande ──► Lot 6  Pesapal
                       │
Lot 7  Admin ──────────┘
Lot 8  Design & performance (transverse, en continu)
Lot 9  Mise en ligne
```

---

## VERSION 1 — la boutique qui vend

**Objectif :** un client au Rwanda peut trouver un produit, l'acheter, payer avec MTN MoMo
ou sa carte, et suivre sa commande. Toi, tu gères tout depuis un seul tableau de bord.

### Lot 0 — Fondations

- Monorepo Turborepo, Next.js 15, TypeScript, Tailwind
- Schéma PostgreSQL complet + Prisma + migrations (**y compris les champs V2/V3** :
  `vendor_id`, `supplier_id`, tables de traduction, devises)
- Environnements local / préproduction / production
- Intégration continue : tests, analyse de code, contrôle de performance
- Comptes de service créés **à ton nom**

_Livrable : une application qui démarre, une base prête pour toute la V3._

### Lot 1 — Catalogue

- Catégories arborescentes, marques
- Produits, variantes, images (téléversement + optimisation automatique WebP/AVIF)
- Page catégorie avec filtres et tri
- **Fiche produit complète** : galerie photos, prix, ancien prix barré, description,
  caractéristiques, variantes, disponibilité, quantité, produits similaires
- Emplacement prévu pour les avis clients (activés en V2)

### Lot 2 — Recherche

- Recherche plein texte : nom, catégorie, marque, mots-clés, référence
- Insensible aux accents, tolérante aux fautes de frappe
- Filtres : prix, catégorie, disponibilité, nouveautés, meilleures ventes, promotions
- Suggestions pendant la saisie
- Barre de recherche mise en avant sur l'accueil, comme demandé

### Lot 3 — Comptes clients

- Inscription nom / téléphone / e-mail / mot de passe
- Connexion, déconnexion, **récupération de mot de passe**
- Espace personnel : informations, carnet d'adresses (format rwandais :
  province / district / secteur / point de repère)
- Historique de commandes : en cours, terminées, annulées

### Lot 4 — Panier

- Ajout, modification des quantités, suppression
- Sous-total, frais de livraison, total
- Panier persistant, y compris pour un visiteur non connecté
- Contrôle de stock en temps réel

### Lot 5 — Commande

- Tunnel de commande : adresse → livraison → récapitulatif
- Calcul des frais de livraison par zone
- **Numéro de commande unique** (`BRL-2026-000123`)
- Machine à états et réservation de stock transactionnelle
- Page de suivi côté client
- E-mail de confirmation

### Lot 6 — Paiement Pesapal 🔑

- Interface `PaymentProvider` + implémentation Pesapal
- Développement et validation complets sur le **bac à sable**
- Gestion des cinq issues : réussi, échoué, annulé, en attente, remboursé
- Idempotence, réconciliation automatique, journal des événements
- Passage en production après validation des cinq scénarios

_C'est le lot le plus sensible du projet. Il ne sera pas bâclé._

### Lot 7 — Tableau de bord administrateur

- **Produits** : créer, modifier, supprimer, prix, stock, photos, catégories, promotions
- **Commandes** : liste, recherche, changement de statut, ajout du numéro de suivi,
  vue du paiement, informations client
- **Clients** : liste, consultation, historique, activation/désactivation
- **Paiements** : réussis, échoués, en attente ; remboursement
- **Statistiques** : commandes, chiffre d'affaires, produits vendus, meilleurs produits,
  nouveaux clients, commandes en cours
- Double authentification obligatoire + journal d'audit

### Lot 8 — Design & performance _(transverse)_

- **Identité visuelle propre à Beralshopp** : logo, palette, typographie, composants
- Accueil complet : logo, recherche, catégories, produits populaires, nouveaux arrivages,
  promotions, recommandations, bannière, bouton WhatsApp, panier, compte,
  section « Comment commander ? », contact
- Conception **mobile en priorité** (la majorité de tes clients sera sur téléphone)
- Atteinte des cibles de performance du document 01 (LCP < 2,5 s, Lighthouse ≥ 90)

### Lot 9 — Mise en ligne

- Domaine, HTTPS, e-mails transactionnels, supervision
- Import du catalogue initial
- Vérification de bout en bout avec de **vrais paiements de faible montant**
- Formation à l'utilisation du tableau de bord
- Documentation remise

**Fin de V1 :** plateforme e-commerce complète et opérationnelle au Rwanda.

---

## VERSION 2 — l'expansion

Déclenchée quand la V1 génère des ventes régulières. Chaque élément est indépendant :
on les active selon tes priorités commerciales, pas dans un ordre imposé.

| Fonction                                                       | Dépend de                                 |
| -------------------------------------------------------------- | ----------------------------------------- |
| Multi-devises côté client (RWF, XAF, XOF, USD, EUR)            | tables déjà créées en V1                  |
| Multi-langues (FR / EN / **AR** avec écriture droite-à-gauche) | tables de traduction déjà créées en V1    |
| Notifications e-mail + SMS/WhatsApp à chaque étape             | infrastructure de tâches déjà en place    |
| **CinetPay** (Côte d'Ivoire, Sénégal, Bénin, Cameroun, RDC)    | interface `PaymentProvider` déjà en place |
| Suivi de livraison enrichi, intégration transporteurs          | —                                         |
| Avis clients avec modération                                   | emplacement déjà prévu en V1              |
| Promotions avancées : codes, ventes flash, lots                | —                                         |
| Statistiques avancées, export comptable                        | —                                         |
| Recherche Meilisearch (au-delà de ~50 000 produits)            | interface `SearchService` déjà en place   |
| Paiement à la livraison                                        | —                                         |

> **Chaque ligne de ce tableau est déjà anticipée dans l'architecture V1.**
> C'est précisément l'objet du dossier technique : aucune de ces fonctions ne demandera
> de reconstruire quoi que ce soit.

---

## VERSION 3 — la plateforme

| Chantier                       | Contenu                                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Application mobile**         | React Native + Expo, Android et iOS, branchée sur l'API `/api/v1` existante. Notifications push.                                                                                                                       |
| **Dropshipping Sunsky**        | Interface `SupplierAdapter` : import produits, photos, descriptions, prix, disponibilité ; synchronisation périodique ; règles de marge ; transmission automatique des commandes quand l'API du fournisseur le permet. |
| **Autres fournisseurs**        | Un adaptateur par fournisseur, sans toucher au reste.                                                                                                                                                                  |
| **Marketplace multi-vendeurs** | Espace vendeur, commissions, reversements, modération. Rendue possible par le champ `vendor_id` présent depuis la V1.                                                                                                  |
| **Automatisation**             | Réapprovisionnement, tarification dynamique, relances de paniers abandonnés.                                                                                                                                           |

---

## Ce dont j'ai besoin de ta part

Pour ne pas être bloqué, voici ce que tu dois préparer — **le reste, je m'en occupe** :

| Quand          | Ce que tu fournis                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Avant le Lot 0 | Validation de ce dossier technique, nom de domaine choisi                                                                            |
| Avant le Lot 1 | Liste des catégories, 10 à 20 produits réels avec photos et descriptions                                                             |
| Avant le Lot 6 | **Accès Pesapal bac à sable puis production** (`consumer_key` + `consumer_secret`) — souvent le point de blocage n°1, à demander tôt |
| Avant le Lot 8 | Ton logo si tu en as un, tes préférences de couleurs, des sites que tu trouves réussis                                               |
| Avant le Lot 9 | Tes zones de livraison et tarifs, ton numéro WhatsApp professionnel, tes conditions de vente                                         |

Sur le Lot 8 (design) : si tu n'as pas encore d'identité visuelle, je te proposerai
**plusieurs directions** avant de développer, pour que Beralshopp ait sa personnalité propre
— inspirée du niveau de fonctionnalité de Kikuu et AliExpress, mais sans les copier.
