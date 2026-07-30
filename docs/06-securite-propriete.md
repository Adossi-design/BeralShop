# 06 — Sécurité, conformité & propriété

---

## 1. Propriété du code et des accès

Tu as posé cette exigence explicitement. Voici comment elle est garantie **concrètement**.

### Le code

- Dépôt **GitHub privé créé sous ton compte**, dont tu es propriétaire (_owner_).
- Aucune dépendance propriétaire, aucune licence payante, aucun thème acheté.
  Tout le code est écrit pour Beralshopp ou repose sur des bibliothèques libres
  (MIT / Apache 2.0), utilisables commercialement sans restriction.
- **Aucun code caché, aucun composant que tu ne pourrais pas lire ou modifier.**
- Le projet peut être repris par n'importe quel développeur maîtrisant Next.js et
  PostgreSQL — deux technologies extrêmement répandues. Tu n'es lié ni à moi, ni à
  personne d'autre.

### Les accès

**Tous les comptes de service sont créés avec ton adresse e-mail, jamais la mienne :**
Vercel, Neon, Cloudflare, Upstash, Resend, Pesapal, GitHub, nom de domaine.

Tu détiens l'identifiant propriétaire de chacun. Si tu décides d'arrêter la collaboration
demain, **tu conserves l'intégralité du système sans aucune action de ma part**.

### La portabilité

- La base est du **PostgreSQL standard** — exportable par une commande `pg_dump`, importable
  chez n'importe quel hébergeur du monde.
- L'application est **conteneurisable** (Docker) — un fichier `docker-compose.yml` fourni
  permet de tout faire tourner sur n'importe quel serveur, y compris ton ordinateur.
- Les images sont dans **ton** espace de stockage, exportables en masse.
- **Aucune fonction critique ne dépend d'un service impossible à remplacer.**

### Documentation remise

- `README.md` — installation et démarrage
- `docs/` — le présent dossier technique, maintenu à jour
- Fichier d'exemple `.env.example` listant toutes les variables nécessaires
- Procédure de déploiement et de restauration de sauvegarde
- Documentation OpenAPI de l'API `/api/v1`

---

## 2. Sécurité — mesures appliquées dès la V1

### Comptes clients

| Mesure                  | Mise en œuvre                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Mots de passe           | Hachage **Argon2id**. Un mot de passe n'est jamais stocké ni récupérable en clair.                                                         |
| Force du mot de passe   | Minimum 8 caractères, refus des mots de passe des fuites connues (liste HaveIBeenPwned, vérification locale)                               |
| Sessions                | Cookie `httpOnly` + `Secure` + `SameSite=Lax` — inaccessible au JavaScript, donc immunisé au vol par script injecté                        |
| Tentatives de connexion | Limitation progressive : 5 échecs → blocage temporaire par IP **et** par compte                                                            |
| Réinitialisation        | Jeton à usage unique valable 30 minutes, invalidé après usage ; message identique que le compte existe ou non (pas de fuite d'information) |
| Inscription             | Vérification du numéro de téléphone par code SMS (V2), pour limiter les faux comptes                                                       |

### Administration

| Mesure                  | Mise en œuvre                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Accès                   | Rôles stricts `ADMIN` / `SUPPORT` / `CLIENT`, vérifiés **côté serveur à chaque requête** — jamais uniquement en masquant un bouton |
| Double authentification | **Obligatoire** pour tout compte administrateur (TOTP — Google Authenticator)                                                      |
| Journal d'audit         | Toute action admin enregistrée : qui, quoi, quand, valeur avant / après. Non modifiable.                                           |
| Sessions admin          | Durée courte, déconnexion automatique après inactivité                                                                             |
| Actions sensibles       | Remboursement, suppression de produit, modification de prix en masse → confirmation explicite + journalisation                     |

### Paiements

| Risque                                    | Protection                                                                                                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client modifie le prix dans le navigateur | **Le montant est intégralement recalculé sur le serveur.** La valeur envoyée par le client est ignorée.                                                                    |
| Fausse notification de paiement           | On ne fait jamais confiance au webhook : notre serveur **réinterroge Pesapal** avec ses propres identifiants.                                                              |
| Double débit / double traitement          | **Clé d'idempotence** unique par tentative de paiement.                                                                                                                    |
| Paiement perdu (IPN non reçu)             | **Réconciliation automatique** toutes les 15 minutes.                                                                                                                      |
| Fuite des clés Pesapal                    | Les clés vivent **uniquement dans les variables d'environnement du serveur**. Elles ne sont jamais envoyées au navigateur, jamais présentes dans le code, jamais dans Git. |
| Fausses commandes en masse                | Limitation de débit, réservation de stock à durée limitée, détection de comportements anormaux, blocage de numéros/IP depuis l'admin                                       |

> **Beralshopp ne stocke ni ne manipule aucune donnée de carte bancaire.** La saisie a lieu
> intégralement sur la page hébergée par Pesapal. Cela évite d'entrer dans le périmètre de
> certification PCI-DSS, qui serait très lourd et coûteux.

### Application

| Mesure                 | Mise en œuvre                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| HTTPS                  | Obligatoire partout, redirection automatique, en-tête HSTS                                            |
| Injection SQL          | Prisma utilise exclusivement des requêtes paramétrées                                                 |
| XSS                    | React échappe les contenus par défaut ; en-tête Content-Security-Policy strict                        |
| CSRF                   | Cookies `SameSite` + jeton anti-CSRF sur les formulaires sensibles                                    |
| Validation des données | **Zod** sur toute entrée — API, formulaires, webhooks. Aucune donnée non validée n'atteint le métier. |
| Téléversement d'images | Type MIME et taille contrôlés, ré-encodage systématique de l'image (neutralise un fichier piégé)      |
| En-têtes de sécurité   | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy                                         |
| Dépendances            | Analyse automatique (Dependabot) + `npm audit` à chaque livraison                                     |
| Secrets                | Aucun secret dans Git. Détection automatique en cas de fuite accidentelle.                            |
| Pare-feu applicatif    | Cloudflare WAF + protection anti-déni de service (incluse gratuitement)                               |
| Supervision            | **Sentry** pour les erreurs, alerte immédiate en cas d'échec de paiement anormal                      |

### Données clients

- Collecte minimale : uniquement ce qui est nécessaire à la livraison et au paiement.
- Chiffrement en transit (TLS) et au repos (chiffrement disque du fournisseur).
- Suppression de compte possible à la demande du client (les commandes sont anonymisées,
  pas supprimées — obligation comptable).
- Aucune revente ni partage de données à des tiers.
- Le Rwanda dispose d'une **loi sur la protection des données personnelles (2021)**
  imposant notamment l'enregistrement des responsables de traitement auprès de la NCSA.
  **À vérifier avec un juriste local avant la mise en ligne commerciale** — c'est une
  démarche administrative, pas technique, mais elle doit être anticipée.

---

## 3. Sauvegardes et continuité

| Élément                                 | Politique                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Base de données                         | Sauvegarde automatique quotidienne, conservée 30 jours                                                                               |
| Restauration à un instant précis (PITR) | 7 jours glissants                                                                                                                    |
| Export hors fournisseur                 | `pg_dump` chiffré mensuel, déposé sur **ton** espace de stockage personnel — protège contre la perte d'accès au fournisseur lui-même |
| Images                                  | Réplication R2 + versionnage des objets                                                                                              |
| Code                                    | GitHub + copie locale sur ta machine                                                                                                 |
| **Test de restauration**                | **Trimestriel, avec restauration réelle vérifiée.** Une sauvegarde jamais testée n'est pas une sauvegarde.                           |

---

## 4. Ce qui est volontairement reporté

Par honnêteté, voici ce qui n'est **pas** couvert en V1, et pourquoi :

| Sujet                       | Pourquoi plus tard                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| Audit de sécurité externe   | Pertinent à partir d'un volume significatif. Compter 1 000 – 3 000 $.                              |
| Certification PCI-DSS       | Non nécessaire tant que les cartes sont saisies chez Pesapal.                                      |
| Conformité RGPD complète    | Requise uniquement si tu cibles des clients européens.                                             |
| Détection de fraude avancée | Les protections de base suffisent au démarrage ; un moteur de scoring devient utile à fort volume. |
| Redondance multi-région     | Coût élevé, justifié seulement à un chiffre d'affaires important.                                  |
