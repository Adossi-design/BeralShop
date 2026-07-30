# 04 — Hébergement & coûts

> **Développement assuré par Claude (assistant IA), avec toi comme propriétaire du projet.**
> Il n'y a donc **aucun coût de prestataire ni d'agence**. Les montants ci-dessous sont
> uniquement des **coûts d'infrastructure et de services**, que tu paies directement aux
> fournisseurs, avec **tes propres comptes** (voir document 06).

---

## 1. Deux options d'hébergement

### Option A — Services gérés ✅ **recommandée pour démarrer**

Chaque brique est un service géré : sauvegardes, mises à jour, sécurité et montée en charge
sont assurées par le fournisseur. Tu ne gères aucun serveur.

| Service                        | Rôle                                        | Coût mensuel          |
| ------------------------------ | ------------------------------------------- | --------------------- |
| **Vercel Pro**                 | Site + API                                  | 20 $                  |
| **Neon** (PostgreSQL)          | Base de données + sauvegardes + PITR        | 0 $ → 19 $            |
| **Upstash Redis**              | Cache, sessions, limitation de débit        | 0 $ → 10 $            |
| **Cloudflare R2**              | Images produits (pas de frais de sortie)    | 1 – 5 $               |
| **Cloudflare** (CDN, DNS, WAF) | Diffusion + pare-feu applicatif             | 0 $                   |
| **Inngest**                    | Tâches de fond, relances, tâches planifiées | 0 $ → 20 $            |
| **Resend**                     | E-mails transactionnels                     | 0 $ → 20 $            |
| **Sentry**                     | Détection des erreurs en production         | 0 $ → 26 $            |
| **Nom de domaine** `.com`      |                                             | ≈ 1 $/mois (12 $/an)  |
|                                | **Démarrage**                               | **≈ 22 – 30 $/mois**  |
|                                | **En croissance**                           | **≈ 90 – 120 $/mois** |

> ⚠️ **Vercel Hobby (gratuit) interdit l'usage commercial.** Le plan Pro à 20 $ est
> obligatoire dès la mise en ligne de Beralshopp. Ne pas le prévoir expose à une suspension
> du site sans préavis.

### Option B — Serveur dédié (VPS auto-hébergé)

Tout tourne sur une machine unique via Docker et Coolify (interface de déploiement libre).

| Élément                                          | Coût mensuel                                  |
| ------------------------------------------------ | --------------------------------------------- |
| **Hetzner CPX31** (4 vCPU, 8 Go RAM, 160 Go SSD) | ≈ 16 $                                        |
| Sauvegardes automatiques Hetzner (+20 %)         | ≈ 3 $                                         |
| Cloudflare (CDN, DNS, WAF)                       | 0 $                                           |
| Resend / Brevo (e-mails)                         | 0 – 20 $                                      |
| Nom de domaine                                   | ≈ 1 $                                         |
|                                                  | **≈ 20 – 40 $/mois, quel que soit le trafic** |

Sur cette machine : PostgreSQL, Redis, Meilisearch, MinIO (images), l'application et les
tâches de fond. Largement dimensionné pour plusieurs milliers de commandes par mois.

### Comparaison honnête

| Critère                                     | A — Géré                   | B — VPS                               |
| ------------------------------------------- | -------------------------- | ------------------------------------- |
| Coût au démarrage                           | ≈ 25 $                     | ≈ 20 $                                |
| Coût à forte croissance                     | 90 – 400 $                 | 25 – 60 $                             |
| Temps d'administration                      | ≈ 0 h/mois                 | 4 – 8 h/mois                          |
| Sauvegardes & restauration à l'instant      | automatiques               | à configurer et **à tester**          |
| Montée en charge lors d'un pic (promo, pub) | automatique                | manuelle, risque de saturation        |
| Mises à jour de sécurité système            | fournisseur                | **ta responsabilité**                 |
| Risque de panne totale                      | faible (redondance)        | machine unique = point de défaillance |
| Réversibilité                               | élevée (tout est standard) | élevée                                |

**Recommandation : commencer en Option A.** Tant que le volume est faible, l'écart de coût
est négligeable (quelques dollars), et tu consacres ton temps à vendre plutôt qu'à
administrer un serveur. Une panne de base de données non sauvegardée coûte infiniment plus
cher que 20 $/mois.

**Bascule vers B envisageable** au-delà de ≈ 150 $/mois de facture gérée. Comme toute la
pile est standard (PostgreSQL, Redis, Docker), la migration prend 2 à 3 jours, sans
réécriture. **Aucun enfermement.**

---

## 2. Localisation des serveurs

Point souvent négligé, mais déterminant pour la vitesse ressentie au Rwanda.

| Composant                    | Emplacement                                                             | Justification                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Images, CSS, pages statiques | **CDN Cloudflare** — points de présence à Kigali, Nairobi, Johannesburg | Servis localement, ≈ 20 – 60 ms                                                                                                                                          |
| Base de données              | **Francfort (eu-central-1)**                                            | Meilleur compromis latence/prix vers l'Afrique de l'Est. Le Cap (af-south-1) est plus proche géographiquement mais mal desservi par les fournisseurs gérés et plus cher. |
| Application                  | Francfort, **au même endroit que la base**                              | Critique : une application éloignée de sa base multiplie les allers-retours réseau. Colocaliser vaut mieux qu'un déploiement « mondial ».                                |

**À faire dès la mise en ligne :** mesurer les temps de réponse réels depuis Kigali, Douala
et N'Djamena. Si la latence est décevante, la solution n'est pas de déplacer la base, mais
d'augmenter la mise en cache CDN — 90 % du trafic e-commerce est constitué de pages
consultables en cache.

---

## 3. Coût réel principal : les commissions de transaction

C'est le poste qui dépasse rapidement tout le reste. À ne pas sous-estimer.

**Pesapal ≈ 3,5 % par transaction réussie** _(à confirmer dans ton contrat marchand)_

| Commandes/mois | Panier moyen | Volume d'affaires | Commission ≈ 3,5 %        | Infrastructure | **Total**     |
| -------------- | ------------ | ----------------- | ------------------------- | -------------- | ------------- |
| 50             | 25 000 Frw   | 1 250 000 Frw     | ≈ 44 000 Frw (34 $)       | ≈ 25 $         | **≈ 59 $**    |
| 300            | 25 000 Frw   | 7 500 000 Frw     | ≈ 262 000 Frw (200 $)     | ≈ 40 $         | **≈ 240 $**   |
| 1 500          | 25 000 Frw   | 37 500 000 Frw    | ≈ 1 312 000 Frw (1 000 $) | ≈ 90 $         | **≈ 1 090 $** |

_(conversion indicative sur la base de 1 $ ≈ 1 310 Frw — à ajuster)_

**Enseignement :** dès 300 commandes par mois, la commission Pesapal représente **plus de
80 %** de tes coûts techniques. L'optimisation prioritaire n'est donc pas l'hébergement,
mais la **négociation du taux de commission** avec Pesapal une fois le volume établi — les
prestataires accordent des taux dégressifs. Une réduction de 3,5 % à 2,8 % à 1 500 commandes
mensuelles économise environ 200 $ par mois, soit plus que toute ton infrastructure.

---

## 4. Budget de démarrage à prévoir

| Poste                                | Montant                           | Fréquence       |
| ------------------------------------ | --------------------------------- | --------------- |
| Nom de domaine `beralshopp.com`      | ≈ 12 $                            | annuel          |
| Infrastructure (3 premiers mois)     | ≈ 75 $                            | mensuel ensuite |
| Compte marchand Pesapal              | 0 $ _(sans frais d'installation)_ | —               |
| Photographie / retouche produits     | variable                          | selon catalogue |
| **Total minimum pour être en ligne** | **≈ 90 $**                        | + ≈ 25 $/mois   |

Le développement, l'architecture, le design et l'intégration Pesapal sont réalisés dans le
cadre de notre travail ensemble — sans coût de prestataire.

---

## 5. Ce qui n'est **pas** inclus et qu'il faudra décider plus tard

- **Publicité et acquisition client** — de loin le premier poste de dépense d'une plateforme
  e-commerce en croissance. Sans budget marketing, un site parfait ne vend rien.
- **Logistique et livraison** — transporteurs, emballage, éventuel entrepôt.
- **Frais bancaires** de retrait / conversion depuis Pesapal vers ton compte.
- **Conformité fiscale rwandaise** — TVA et facturation électronique **EBM** exigée par la
  RRA pour les entreprises assujetties. À vérifier avec ton comptable : si tu es concerné,
  il faudra prévoir l'intégration de la facturation conforme. **Point à clarifier avant la
  mise en ligne commerciale**, car cela peut nécessiter un module supplémentaire.
- **Comptes développeur mobile** (V3) : Google Play 25 $ une fois, Apple 99 $/an.
