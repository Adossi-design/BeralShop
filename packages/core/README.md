# @beralshopp/core

**Logique métier de Beralshopp.** Ne connaît ni Next.js, ni React, ni HTTP.

## Pourquoi ce paquet existe

C'est la décision structurante du projet (voir [docs/01](../../docs/01-architecture-technique.md)).

Une route API valide son entrée, appelle un service d'ici, formate la réponse.
**Jamais de calcul de prix ni de requête SQL dans une page.**

Conséquence concrète : le jour où le trafic impose d'extraire l'API dans un service
dédié, ce paquet part tel quel. C'est un déplacement de dossier, pas une réécriture.
Et l'application mobile consommera exactement la même logique.

## Règle d'import

```
apps/web  →  @beralshopp/core  →  @beralshopp/db
                              →  @beralshopp/shared
```

Les flèches ne remontent jamais. Si un fichier de `core/` importe quoi que ce soit de
`apps/web`, c'est une erreur d'architecture.

## Modules

| Module           | Rôle                                            | Lot |
| ---------------- | ----------------------------------------------- | --- |
| `catalog/`       | Catégories, produits, variantes, recherche      | 1   |
| `pricing/`       | Prix affichés, promotions, conversion de devise | 1   |
| `cart/`          | Panier, calcul des totaux                       | 4   |
| `inventory/`     | Stock, réservations                             | 4   |
| `orders/`        | Commandes, machine à états                      | 5   |
| `payments/`      | Interface `PaymentProvider` et adaptateurs      | 6   |
| `notifications/` | E-mail, SMS, WhatsApp                           | V2  |
| `suppliers/`     | Interface `SupplierAdapter` (Sunsky…)           | V3  |
