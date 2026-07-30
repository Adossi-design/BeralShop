# Photos des produits — dépose tes fichiers ici

Ce dossier est la **boîte de dépôt** des photos produits. Tu y mets tes fichiers,
puis tu lances :

```
pnpm db:images
```

et les photos apparaissent sur le site. Rien d'autre à faire.

## Règle de nommage — une seule règle

Le nom du fichier commence par la **référence (SKU)** du produit, suivie d'un
numéro d'ordre :

```
ELEC-CAM-Q8-1.jpg      ← photo principale de la caméra
ELEC-CAM-Q8-2.jpg      ← deuxième photo
ELEC-CAM-Q8-3.jpg
SANTE-OTO-Q10-1.jpg    ← photo principale de l'otoscope
SANTE-OTO-Q10-2.jpg
```

- La photo n° 1 devient la photo principale (celle des vignettes).
- Formats acceptés : `.jpg`, `.jpeg`, `.png`, `.webp`.
- Majuscules ou minuscules, peu importe.
- La référence de chaque produit est visible dans l'admin (`/admin/produits`)
  et sur la fiche produit (« Réf. »).

## Ce que fait `pnpm db:images`

1. Copie chaque photo vers `apps/web/public/images/produits/` (le dossier servi
   par le site) en la renommant proprement.
2. Enregistre les images en base, dans le bon ordre, avec un texte alternatif.
3. Relancer la commande est sans danger : elle remplace, elle ne duplique pas.

## Limite actuelle (V1)

Les photos vivent dans le projet et partent avec le déploiement. C'est simple et
gratuit, et cela convient à un catalogue de dizaines de produits. Quand le
catalogue grossira, on passera sur un stockage dédié (Vercel Blob) avec envoi
direct depuis l'admin — prévu, pas encore nécessaire.
