# 📲 Déployer l'appli ESS Catalogue — gratuit, depuis votre téléphone

L'appli est un **dossier web autonome** (PWA) : pas de serveur à payer, pas de compte
obligatoire, pas de code à compiler. Une fois en ligne, elle s'installe sur l'écran
d'accueil du téléphone comme une vraie application et **fonctionne hors connexion**.

## Option 0 — Tester immédiatement (rien à installer)
Ouvrez l'aperçu live fourni par Arena sur votre téléphone, puis dans le menu du
navigateur : **« Ajouter à l'écran d'accueil »**. L'icône ESS apparaît comme une appli.

## Option 1 — Hébergement gratuit durable, 100 % depuis le téléphone (≈ 5 min)
1. Sur le navigateur du téléphone, ouvrez **tiiny.host**.
2. Choisissez le zip **ESS_mini_appli_PWA.zip** (depuis Drive : le télécharger d'abord).
3. Donnez un nom de sous-domaine gratuit (ex. `ess-catalogue.tiiny.site`) → publier.
4. Ouvrez ce lien sur le téléphone → menu du navigateur →
   **« Ajouter à l'écran d'accueil »** → terminé ✔
   Autre choix gratuit longue durée (depuis un ordinateur) : **Cloudflare Pages**
   (`ess-catalogue.pages.dev`) ou **Netlify Drop** (glisser-déposer le zip).

## Option 2 — Depuis un ordinateur (≈ 2 min)
**Netlify Drop** : allez sur `app.netlify.com/drop`, glissez-déposez le dossier
`ess-app` dézippé → lien gratuit `xxx.netlify.app`. Même étape finale :
ajouter à l'écran d'accueil.

## Option 3 — Votre route habituelle GitHub + Render
Créez un repo GitHub, poussez le contenu du dossier `ess-app` à la racine,
puis sur Render : **New → Static Site**, dossier public = `/`, build = aucun.
(Vous avez déjà utilisé Render pour la boutique ESS.)

## Mettre à jour le catalogue plus tard
- Depuis l'appli : mode **⚙️ gestion** → modifier prix/stock, ajouter un produit avec
  la photo prise au téléphone, puis **⬇️ Exporter le catalogue (CSV)** → envoyez-le
  (WhatsApp/email) ou gardez-le pour la base de données.
- Pour republier : remplacez `data/products.json` et les images, re-uploadez le zip.

## Contenu du zip
- `index.html`, `app.js`, `style.css`, `manifest.webmanifest`, `sw.js` (l'appli)
- `data/products.json` : les 1 205 articles unifiés
- `images/` : les 1 181 visuels avec logo ESS
- `img/` : icônes et logo de l'appli
