# ESS Catalogue — Mini-application PWA

Catalogue produits **ESS · Elmansour Supplies & Services** :
1 205 articles, 1 181 visuels avec logo ESS, recherche, fiches, gestion stock/prix,
export CSV, fonctionnement hors connexion (service worker).

## Déployer (gratuit)
- **Render** : New → Static Site → ce dépôt → Build Command *vide*, Publish Directory *vide* → Create.
- **Netlify / Cloudflare Pages** : glisser-déposer ce dossier ou le zip.
- Voir `GUIDE_DEPLOIEMENT_TELEPHONE.md` pour l'installation sur téléphone
  (« Ajouter à l'écran d'accueil »).

## Contenu
- `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest` : l'application
- `data/products.json` : les 1 205 produits unifiés
- `images/` : visuels 800×800 avec badge logo ESS
- `img/` : icônes PWA et logo
