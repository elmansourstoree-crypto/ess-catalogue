/* ESS Catalogue v2 — PWA : catalogue + gestion + panier + commande WhatsApp + promos + mode client */
/* $() ne plante jamais : si un element n'existe pas encore (ancienne page en cache),
   on renvoie un element vide au lieu de bloquer toute l'appli. */
const VIDE = document.createElement('div');
const $ = s => document.querySelector(s) || VIDE;
const fmt = n => n == null ? null : n.toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' FCFA';
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const esc = s => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const DEFAULT_WA = '221777477778';
const DEFAULT_WAVE = 'https://pay.wave.com/m/M_sn__kJhIPEZIYZA/c/sn/';
const SB = { url: 'https://vitqwefhyywvhdcspeuo.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpdHF3ZWZoeXl3dmhkY3NwZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1ODUyMjMsImV4cCI6MjEwNzE2MTIyM30.fcMZ18-933YuvBSMi0MYTw6tuDm5_M-8yMdzJh5pfvk' };

/* --- balises de diagnostic : chaque etape cle signale au support qu'elle fonctionne --- */
function balise(etape, infos) {
  try {
    fetch(SB.url + '/rest/v1/sync', { method: 'POST', keepalive: true,
      headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ id: 'trace:' + etape + ':' + Date.now(), kind: 'trace',
        data: Object.assign({ etape, url: location.href, ua: navigator.userAgent.slice(0, 150),
          quand: new Date().toISOString() }, infos || {}) }]) });
  } catch (e) {}
}
window.addEventListener('error', e => {
  balise('erreur-js-tot', { erreur: String(e.message || '') + ' | ' + String(e.filename || '') + ' ligne ' + e.lineno + ' col ' + e.colno });
});
window.addEventListener('unhandledrejection', e => {
  balise('erreur-promesse-tot', { erreur: String(e.reason && e.reason.message ? e.reason.message : e.reason).slice(0, 300) });
});
balise('app.js-demarre');
let BASE = [], EDITS = {}, DELS = [], NEWS = [], CART = {}, WA = DEFAULT_WA, WAVE = DEFAULT_WAVE;
let vue = { q: '', cat: '', stock: '', marque: '', haut: false, liste: [], offset: 0 };
let admin = false, client = false, refCourante = null, deferredPrompt = null;
let selMode = false; const SEL = new Set();
const PAS = 48;

function charge(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }
function sauve(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
const imgSrc = p => p.img.startsWith('data:') ? p.img : 'images/' + p.img;
let PIN = charge('ess_pin_v1', '2026');

function produits() {
  const map = new Map();
  for (const p of BASE) map.set(p.ref, Object.assign({}, p));
  for (const p of NEWS) map.set(p.ref, Object.assign({}, p));
  for (const [ref, e] of Object.entries(EDITS)) if (map.has(ref)) Object.assign(map.get(ref), e);
  for (const r of DELS) map.delete(r);
  for (const [ref, e] of Object.entries(EDITS)) if (map.has(ref)) IDX.set(ref, cle(map.get(ref)));
  return [...map.values()];
}
const prixDe = p => (p.promo ? p.promo : p.prix);
const SYN = {
  'climatiseur': ['clim', 'climatisation', 'air conditionne', 'split', 'froid'],
  'clim': ['climatiseur', 'climatisation'],
  'refrigerateur': ['frigo', 'frigidaire', 'froid', 'combine'],
  'congelateur': ['congelo', 'surgelateur', 'freezer', 'froid'],
  'ordinateur': ['pc', 'ordi', 'portable', 'laptop', 'notebook', 'desktop', 'tour', 'bureautique'],
  'laptop': ['pc portable', 'ordinateur portable', 'ordi', 'notebook'],
  'imprimante': ['printer', 'impression', 'multifonction', 'laser', 'jet encre'],
  'cartouche': ['encre', 'toner', 'consommable', 'recharge'],
  'toner': ['cartouche', 'encre', 'laser'], 'encre': ['cartouche', 'toner'],
  'ecran': ['moniteur', 'display', 'dalle'], 'moniteur': ['ecran', 'display'],
  'televiseur': ['tv', 'tele', 'smart tv', 'led', 'uhd'], 'tv': ['televiseur', 'tele'],
  'souris': ['mouse', 'sans fil', 'optique'], 'clavier': ['keyboard', 'azerty', 'sans fil'],
  'onduleur': ['ups', 'inverter', 'secours'], 'ups': ['onduleur'],
  'regulateur': ['avr', 'stabilisateur', 'tension'], 'rallonge': ['multiprise', 'prolongateur', 'prise'],
  'disque': ['dd', 'hdd', 'ssd', 'stockage'], 'ssd': ['disque dur', 'nvme', 'stockage'],
  'disque dur': ['ssd', 'hdd', 'stockage'], 'memoire': ['ram', 'barrette', 'ddr'],
  'ram': ['memoire', 'barrette', 'ddr'], 'processeur': ['cpu', 'core', 'intel', 'ryzen'],
  'routeur': ['router', 'wifi', 'box', 'modem'], 'switch': ['commutateur', 'reseau', 'port'],
  'camera': ['surveillance', 'videosurveillance', 'cctv', 'cam', 'ip'],
  'videosurveillance': ['camera', 'surveillance', 'securite', 'cctv'],
  'cuisiniere': ['gaziniere', 'four', 'cuisson', 'gaz'], 'four': ['cuisiniere', 'cuisson', 'encastrable'],
  'lave': ['machine a laver', 'lave linge', 'lavage'], 'machine': ['lave linge', 'electromenager'],
  'tableau': ['tableau blanc', 'paperboard', 'affichage', 'reunion'],
  'casque': ['ecouteurs', 'headset', 'audio', 'micro'],
  'enceinte': ['speaker', 'haut parleur', 'bluetooth', 'audio'],
  'telephone': ['smartphone', 'portable', 'mobile', 'tel', 'android'],
  'tablette': ['ipad', 'tablet', 'tactile'], 'chargeur': ['adaptateur', 'alimentation', 'usb'],
  'batterie': ['accumulateur', 'charge'], 'ventilateur': ['ventilo', 'brasseur', 'air'],
  'aspirateur': ['aspiro', 'nettoyage'], 'micro onde': ['microonde', 'micro onde', 'four'],
  'projecteur': ['videoprojecteur', 'projection'], 'cle': ['cle usb', 'flash', 'pendrive'],
  'cable': ['cord', 'cablage'], 'sacoche': ['sac', 'housse', 'etui'], 'support': ['pied', 'fixation'],
  'serveur': ['server', 'nas'], 'gaming': ['gamer', 'jeu', 'victus', 'ryzen']
};
const CATKW = {
  'Ordinateurs': ['pc', 'ordi', 'ordinateur', 'portable', 'laptop', 'bureautique', 'informatique'],
  'Composants & Stockage': ['composant', 'stockage', 'piece', 'upgrade'],
  'Impression & Consommables': ['impression', 'consommable', 'imprimante', 'encre', 'toner', 'cartouche'],
  'Réseaux & Wi-Fi': ['reseau', 'wifi', 'ethernet', 'lan', 'internet'],
  'Énergie (Onduleurs, Régulateurs, Rallonges)': ['energie', 'onduleur', 'regulateur', 'rallonge', 'alimentation'],
  'Sécurité & Vidéosurveillance': ['securite', 'surveillance', 'videosurveillance', 'cctv'],
  'Climatisation & Ventilation': ['clim', 'climatisation', 'ventilation'],
  'Froid (Réfrigérateurs & Congélateurs)': ['froid', 'refrigeration'],
  'TV, Audio & Vidéo': ['tele', 'tv', 'video', 'audio', 'televiseur'],
  'Téléphonie & Tablettes': ['telephonie', 'telephone', 'mobile', 'tablette'],
  'Petit électroménager': ['electromenager', 'menager'],
  'Cuisson & Encastrable': ['cuisson', 'encastrable'],
  'Lavage & Entretien': ['lavage', 'entretien'],
  'Écrans & Moniteurs': ['ecran', 'moniteur', 'affichage'],
  'Accessoires informatiques': ['accessoire', 'informatique', 'peripherique'],
  'Mobilier & Maison': ['meuble', 'mobilier', 'maison'],
  'Caisse, Bureau & Point de vente': ['caisse', 'point de vente', 'commerce'],
  'Tableaux blancs & Affichage': ['tableau', 'tableau blanc', 'affichage'],
  'Logiciels & Licences': ['logiciel', 'licence'],
  'Consoles & Jeux': ['console', 'jeu', 'jeux']
};
const MQKW = {
  'HP': ['hewlett', 'packard', 'pavilion', 'victus', 'elitebook', 'probook'],
  'Lenovo': ['thinkpad', 'ideapad', 'legion', 'thinkcentre'],
  'Apple': ['macbook', 'imac', 'iphone', 'ipad', 'mac'],
  'Samsung': ['galaxy', 'samsun'], 'Hikvision': ['hikvison'], 'Hisense': ['hisence'],
  'TP-Link': ['tplink', 'tp link', 'archer', 'deco'], 'Ubiquiti': ['ubnt', 'unifi'],
  'Dell': ['inspiron', 'latitude', 'optiplex', 'vostro'], 'Canon': ['pixma'],
  'Epson': ['ecotank', 'workforce'], 'Xiaomi': ['redmi', 'poco'],
  'Microsoft': ['surface', 'windows'], 'SanDisk': ['sandisk', 'western digital']
};
function cle(p) {
  const n = norm(p.nom), c = norm(p.cat);
  const mots = new Set([n, c, norm(p.marque), norm(p.ref)]);
  (CATKW[p.cat] || []).forEach(k => mots.add(norm(k)));
  (MQKW[p.marque] || []).forEach(k => mots.add(norm(k)));
  if (p.spec) Object.values(p.spec).forEach(v => mots.add(norm(v)));
  for (const t in SYN) {
    const tn = norm(t);
    if (n.includes(tn) || c.includes(tn)) SYN[t].forEach(s => mots.add(norm(s)));
  }
  if (p.desc) { const d = norm(p.desc); if (d.includes('climatiseur')) mots.add('clim'); }
  return [...mots].filter(Boolean).join(' ');
}
const coupe = (s, n) => { const t = (s || '').trim(); return t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '') + '…'; };
let IDX = new Map();
function indexe() {
  IDX = new Map();
  for (const p of BASE) IDX.set(p.ref, cle(p));
  for (const p of NEWS) IDX.set(p.ref, cle(p));
  for (const [ref, e] of Object.entries(EDITS)) { const b = BASE.concat(NEWS).find(x => x.ref === ref);
    if (b) IDX.set(ref, cle(Object.assign({}, b, e))); }
}

function filtres() {
  let l = produits();
  if (vue.cat) l = l.filter(p => p.cat.split(' | ')[0] === vue.cat);
  if (vue.stock) l = l.filter(p => p.stock === vue.stock);
  if (vue.marque) l = l.filter(p => p.marque === vue.marque);
  if (vue.haut) { const vus = new Set();
    l = l.filter(p => { if (!p.grp) return true; if (p.prix !== p.maxg) return false;
      if (vus.has(p.grp)) return false; vus.add(p.grp); return true; }); }
  if (vue.q) {
    const toks = norm(vue.q).split(' ').filter(t => t.length > 1);
    l = l.filter(p => { const s = IDX.get(p.ref) || cle(p);
      return toks.every(t => s.includes(t) || s.includes(t.replace(/s$/, ''))); });
  }
  l.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  return l;
}

/* ---------- liste ---------- */
function specCourt(p) {
  if (!p.spec) return '';
  const t = [];
  if (p.spec['Processeur']) t.push(p.spec['Processeur']);
  if (p.spec['Mémoire RAM']) t.push(/^\d+$/.test(p.spec['Mémoire RAM']) ? p.spec['Mémoire RAM'] + ' Go de RAM' : p.spec['Mémoire RAM']);
  if (p.spec['Stockage']) t.push(p.spec['Stockage']);
  return t.slice(0, 3).join(' · ');
}
function carteHTML(p) {
  const pv = prixDe(p);
  const prix = pv != null ? fmt(pv) : (p.pinfo || 'Sur demande');
  const promo = p.promo && p.prix ? `<s class="ancien">${fmt(p.prix)}</s> <span class="badge promo">PROMO</span>` : '';
  const stock = client ? '' : (p.qte != null && p.qte !== '' ? `<span class="s ${+p.qte > 0 ? '' : 'non'}">● Stock : ${p.qte}</span>` : p.stock === 'oui' ? '<span class="s">● En stock</span>' : p.stock === 'non' ? '<span class="s non">● Épuisé</span>' : '');
  const crayon = admin ? `<button class="crayon" data-ed="${p.ref}" aria-label="Modifier">✏️</button>` : '';
  const boite = selMode ? `<span class="case">${SEL.has(p.ref) ? '✅' : '⬜'}</span>` : '';
  const court = specCourt(p);
  return `<button class="carte${SEL.has(p.ref) ? ' sel' : ''}" data-ref="${p.ref}">
    <div style="position:relative"><img loading="lazy" src="${imgSrc(p)}" alt="">${crayon}${boite}</div>
    <div class="c"><span class="n">${esc(p.nom)}</span><span class="p">${esc(prix)} ${promo}</span>${stock}${court ? `<span class="fr">${esc(court)}</span>` : (p.marque ? `<span class="fr">${esc(p.marque)}</span>` : '')}<span class="de">${esc(coupe(p.desc, 95))}</span></div></button>`;
}
/* ---------- selection multiple ---------- */
function majSel() {
  const n = SEL.size;
  $('#selInfo').textContent = n ? `${n} article${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}` : 'Touchez les articles à sélectionner';
  $('#selBar').hidden = !selMode;
  document.body.classList.toggle('selmode', selMode);
}
function basculeSel(ref, el) {
  SEL.has(ref) ? SEL.delete(ref) : SEL.add(ref);
  const on = SEL.has(ref);
  el.classList.toggle('sel', on);
  const b = el.querySelector('.case'); if (b) b.textContent = on ? '✅' : '⬜';
  majSel();
}
function appliquePrix(fn, label) {
  const P = new Map(produits().map(p => [p.ref, p]));
  let n = 0;
  for (const r of SEL) {
    const p = P.get(r); if (!p) continue;
    const nv = fn(p); if (!nv) continue;
    EDITS[r] = Object.assign({}, EDITS[r], { prix: nv, promo: '' });
    pousse('edit:' + r, 'edit', EDITS[r]); n++;
  }
  sauve('ess_edits_v1', EDITS); indexe(); renduListe(true); majEtat();
  $('#prixEtat').textContent = `✔ ${label} appliquée à ${n} article${n > 1 ? 's' : ''}`;
}
function renduChips() {
  const P = produits(); const cc = {}, mc = {};
  for (const p of P) { const c = p.cat.split(' | ')[0]; cc[c] = (cc[c] || 0) + 1; }
  for (const p of P) if (p.marque && (!vue.cat || p.cat.split(' | ')[0] === vue.cat)) mc[p.marque] = (mc[p.marque] || 0) + 1;
  const cats = Object.entries(cc).sort((a, b) => b[1] - a[1]);
  $('#chips').innerHTML = `<button class="chip ${vue.cat ? '' : 'on'}" data-cat="">Tout (${P.length})</button>` +
    cats.map(([c, n]) => `<button class="chip ${vue.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)} (${n})</button>`).join('') +
    (client ? '' : `<button class="chip f ${vue.haut ? 'on' : ''}" data-haut="1" title="Une seule fiche par produit : celle au prix le plus élevé">⚖️ Prix le + élevé</button>`);
  const ms = Object.entries(mc).sort((a, b) => b[1] - a[1]).slice(0, 20);
  if (vue.marque && !ms.some(m => m[0] === vue.marque)) ms.push([vue.marque, mc[vue.marque] || 0]);
  $('#chipsM').innerHTML = `<button class="chip m ${vue.marque ? '' : 'on'}" data-m="">Toutes marques</button>` +
    ms.map(([m, n]) => `<button class="chip m ${vue.marque === m ? 'on' : ''}" data-m="${esc(m)}">${esc(m)} (${n})</button>`).join('');
}
function renduListe(reset) {
  if (reset) { vue.liste = filtres(); vue.offset = 0; $('#grille').innerHTML = ''; }
  $('#grille').insertAdjacentHTML('beforeend', vue.liste.slice(vue.offset, vue.offset + PAS).map(carteHTML).join(''));
  vue.offset = Math.min(vue.offset + PAS, vue.liste.length);
  $('#compteur').textContent = `${vue.liste.length} article${vue.liste.length > 1 ? 's' : ''}` +
    (vue.q ? ` pour « ${vue.q} »` : '') + (vue.cat ? ` · ${vue.cat}` : '') +
    (vue.marque ? ` · ${vue.marque}` : '') + (vue.haut ? ' · prix le + élevé' : '');
  $('#fin').hidden = vue.offset < vue.liste.length;
}

/* ---------- fiche ---------- */
function ouvreFiche(ref) {
  const p = produits().find(x => x.ref === ref); if (!p) return;
  refCourante = ref;
  $('#fNom').textContent = p.nom;
  const pv = prixDe(p);
  const prix = pv != null ? fmt(pv) : (p.pinfo || 'Sur demande');
  const promo = p.promo && p.prix ? `<div class="prixgd" style="margin-top:0"><s class="ancien">${fmt(p.prix)}</s> <span class="badge promo">PROMO</span></div>` : '';
  const badges = [
    !client && p.stock === 'oui' ? '<span class="badge vert">En stock</span>' : !client && p.stock === 'non' ? '<span class="badge rouge">Épuisé</span>' : '',
    `<span class="badge or">${esc(p.cat.split(' | ')[0])}</span>`,
    p.marque ? `<span class="badge or">${esc(p.marque)}</span>` : '',
    `<span class="badge gris">${esc(p.ref)}</span>`].join('');
  $('#fCorps').innerHTML = `
    <img class="gd" src="${imgSrc(p)}" alt="${esc(p.nom)}">
    ${promo}
    <div class="prixgd">${esc(prix)}</div>
    <div>${badges}</div>
    ${admin && p.achat && pv != null ? `<div class="bloc"><h3>Marge (gestion)</h3><p>Prix d'achat : ${fmt(p.achat)} · Marge : <b>${fmt(pv - p.achat)}</b> (${p.achat ? Math.round((pv - p.achat) / p.achat * 100) : 0} %)</p></div>` : ''}
    ${p.spec ? `<div class="bloc"><h3>Caractéristiques techniques</h3><table class="spec">${Object.entries(p.spec).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table></div>` : ''}
    ${p.desc ? `<div class="bloc"><h3>Description</h3><p>${esc(p.desc)}</p></div>` : ''}
    ${p.dim ? `<div class="bloc"><h3>Dimensions</h3><p>${esc(p.dim)}</p></div>` : ''}
    <div class="rangeeBtns">
      <input id="fQte" type="number" min="1" value="1" inputmode="numeric" aria-label="Quantité">
      <button class="btn vert" id="btnAjoutPanier">🛒 Ajouter</button>
    </div>
    <div class="rangeeBtns">
      <button class="btn" id="btnPartager">📤 Partager</button>
      ${admin ? '<button class="btn or" id="btnEdFiche">✏️ Modifier</button>' : ''}
    </div>`;
  $('#fiche').hidden = false; window.scrollTo(0, 0);
  $('#btnAjoutPanier').onclick = () => {
    const q = Math.max(1, +$('#fQte').value || 1);
    CART[ref] = (CART[ref] || 0) + q; sauve('ess_cart_v1', CART); majBadge();
    $('#btnAjoutPanier').textContent = `✔ ${q} ajouté${q > 1 ? 's' : ''}`;
    setTimeout(() => { $('#btnAjoutPanier').textContent = '🛒 Ajouter'; }, 1200);
  };
  $('#btnPartager').onclick = () => {
    const txt = `*${p.nom}* — ${prix}\nESS · Elmansour Supplies & Services (réf. ${p.ref})\nKeur Massar Nord, Dakar · +221 77 747 77 78`;
    if (navigator.share) navigator.share({ text: txt }).catch(() => {});
    else location.href = 'https://wa.me/?text=' + encodeURIComponent(txt);
  };
  const be = $('#btnEdFiche'); if (be) be.onclick = () => ouvreEdition(ref);
}

/* ---------- panier & commande WhatsApp ---------- */
function majBadge() {
  const n = Object.values(CART).reduce((a, b) => a + b, 0);
  const el = $('#cartCount'); el.textContent = n; el.style.display = n ? 'grid' : 'none';
}
function renduPanier() {
  const refs = Object.keys(CART);
  if (!refs.length) { $('#panierListe').innerHTML = '<p class="aide">Panier vide. Ajoutez des articles avec le bouton 🛒 des fiches produits.</p>'; }
  else {
    const P = new Map(produits().map(p => [p.ref, p]));
    $('#panierListe').innerHTML = refs.map(r => {
      const p = P.get(r); if (!p) return '';
      const pv = prixDe(p);
      return `<div class="ligne">
        <img src="${imgSrc(p)}" alt="">
        <div class="linfo"><span class="ln">${esc(p.nom)}</span><span class="lp">${pv != null ? fmt(pv) : 'Sur demande'}</span></div>
        <div class="lqte"><button data-m="${r}">−</button><span>${CART[r]}</span><button data-p="${r}">+</button></div>
        <button class="ldel" data-x="${r}">🗑</button></div>`;
    }).join('');
  }
  const tot = Object.entries(CART).reduce((s, [r, q]) => {
    const p = produits().find(x => x.ref === r); return s + (p && prixDe(p) ? prixDe(p) * q : 0); }, 0);
  $('#panierTotal').innerHTML = `Total : <b>${fmt(tot)}</b>` + (tot ? '' : ' — les articles « sur demande » seront chiffrés par ESS');
}
function commandeWhatsApp() {
  const P = new Map(produits().map(p => [p.ref, p]));
  const lignes = Object.entries(CART).map(([r, q]) => {
    const p = P.get(r); if (!p) return null;
    const pv = prixDe(p);
    return `• ${q} × ${p.nom} (${r}) — ${pv != null ? fmt(pv * q) : 'prix sur demande'}`;
  }).filter(Boolean);
  if (!lignes.length) return;
  const tot = Object.entries(CART).reduce((s, [r, q]) => { const p = P.get(r); return s + (p && prixDe(p) ? prixDe(p) * q : 0); }, 0);
  const nom = $('#nomClient').value.trim();
  const msg = `Bonjour ESS,${nom ? ` je suis ${nom}.` : ''} Je souhaite commander :\n${lignes.join('\n')}\n` +
    `*TOTAL : ${fmt(tot)}*${tot ? '' : ' (à chiffrer)'}\nMerci !`;
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ---------- gestion ---------- */
function ouvreEdition(ref) {
  const p = ref ? produits().find(x => x.ref === ref) : null;
  refCourante = ref || null;
  $('#edTitre').textContent = p ? 'Modifier ' + p.ref : 'Nouveau produit';
  $('#edNom').value = p ? p.nom : ''; $('#edCat').value = p ? p.cat : '';
  $('#edPrix').value = p && p.prix ? p.prix : ''; $('#edPromo').value = p && p.promo ? p.promo : '';
  $('#edAchat').value = p && p.achat ? p.achat : ''; $('#edQte').value = p && p.qte != null && p.qte !== '' ? p.qte : '';
  $('#edStock').value = p ? p.stock : 'oui';
  $('#edPhoto').value = ''; $('#btnSupprimer').style.display = p ? '' : 'none';
  $('#edition').hidden = false;
}
function photoVersData(file, cb) {
  const rd = new FileReader();
  rd.onload = () => { const im = new Image(); im.onload = () => {
    const c = document.createElement('canvas'); const k = 640 / Math.max(im.width, im.height);
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    cb(c.toDataURL('image/jpeg', 0.72)); }; im.src = rd.result; };
  rd.readAsDataURL(file);
}
function exportCSV() {
  const l = produits();
  const tete = 'ref,nom_produit,categorie,marque,prix_fcfa,prix_promo,prix_achat,stock_qte,prix_info,dimensions,description,en_stock,image';
  const q = v => /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  const lignes = l.map(p => [p.ref, p.nom, p.cat, p.marque ?? '', p.prix ?? '', p.promo ?? '', p.achat ?? '', p.qte ?? '', p.pinfo, p.dim, p.desc, p.stock,
    p.img.startsWith('data:') ? p.ref + '_nouveau.jpg' : p.img].map(v => q(String(v ?? ''))).join(','));
  const blob = new Blob(['\ufeff' + tete + '\n' + lignes.join('\n')], { type: 'text/csv;charset=utf-8' });
  const nom = `ESS_catalogue_maj_${new Date().toISOString().slice(0, 10)}.csv`;
  Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nom }).click();
  if (navigator.share) navigator.share({ files: [new File([blob], nom, { type: 'text/csv' })], title: 'Catalogue ESS' }).catch(() => {});
  $('#adminEtat').textContent = `✔ ${l.length} lignes exportées (${nom})`;
}
function majEtat() {
  const n = Object.keys(EDITS).length + NEWS.length + DELS.length;
  $('#adminEtat').textContent = admin ? `${n} modification${n > 1 ? 's' : ''} locale${n > 1 ? 's' : ''} sur cet appareil` : '';
}

/* ---------- devis / factures / journal ---------- */
const ESS = {
  nom: 'ELMANSOUR SUPPLIES & SERVICES (E.S.S.)', act: 'Fournitures & Services',
  adr: 'Keur Massar Nord, QRT Parcelles Assainies — U.03 Villa N°99, Dakar, Sénégal',
  siege: 'Siège social : Dakar Plateau', rccm: 'RCCM : SN.DKR.2024.A.42510 — NINEA : 011629154',
  tel: '+221 77 747 77 78 / +221 76 667 01 10',
  banque: 'Banque : BIS — Banque Islamique du Sénégal · IBAN : SN08 SN07 9011 2425 3187 7910 0141 · SWIFT : ISSNSNDA' };
let VENTES = [], LOGO_B64 = null, docNum = null;

function docDonnees() {
  const P = new Map(produits().map(p => [p.ref, p]));
  const lines = Object.entries(CART).map(([r, q]) => { const p = P.get(r); if (!p) return null;
    return { ref: r, nom: p.nom, q, pu: prixDe(p), achat: p.achat || null }; }).filter(Boolean);
  const total = lines.reduce((s, l) => s + (l.pu ? l.pu * l.q : 0), 0);
  const marge = lines.reduce((s, l) => s + (l.pu && l.achat ? (l.pu - l.achat) * l.q : 0), 0);
  return { lines, total, marge };
}
function getNum() {
  if (!docNum) { const type = $('#docType').value;
    const c = charge('ess_docnum_v1', { fac: 0, dev: 0 }); const k = type === 'facture' ? 'fac' : 'dev';
    c[k] += 1; sauve('ess_docnum_v1', c); pousse('cfg:docnum', 'cfg', c);
    docNum = (type === 'facture' ? 'FAC-' : 'DEV-') + '2026-' + String(c[k]).padStart(4, '0'); }
  return docNum;
}
function remplisDoc() {
  const d = docDonnees(), num = getNum(), type = $('#docType').value;
  const auj = new Date().toLocaleDateString('fr-FR');
  $('#docPrint').innerHTML = `
    <div class="entete"><img src="img/icon-512.png" alt="ESS">
      <div><h1>ELMANSOUR SUPPLIES &amp; SERVICES</h1>
      <p>(E.S.S.) — ${ESS.act}</p><p>${ESS.adr}</p><p>Tél. : ${ESS.tel}</p></div></div>
    <div class="titre">${type === 'facture' ? 'FACTURE' : 'DEVIS'} N° ${num}</div>
    <div class="meta"><div><b>Date d'émission</b><br>${auj}</div>
      <div><b>Mode de paiement</b><br>${esc($('#docPaiement').value)}</div>
      <div><b>Facturé à / Client</b><br>${esc($('#docClient').value.trim() || 'Client de passage')}</div></div>
  iv></div>
    <table><tr><th>N°</th><th>Désignation</th><th class="n">Qté</th><th class="n">Prix unit.</th><th class="n">Montant (FCFA)</th></tr>
    ${d.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.nom)} <small>(${l.ref})</small></td><td class="n">${l.q}</td>
      <td class="n">${l.pu ? l.pu.toLocaleString('fr-FR') : 'sur demande'}</td><td class="n">${l.pu ? (l.pu * l.q).toLocaleString('fr-FR') : '—'}</td></tr>`).join('')}</table>
    <div class="totaux"><div><span>Sous-total</span><span>${fmt(d.total)}</span></div>
      <div class="tt"><span>TOTAL TTC</span><span>${fmt(d.total)}</span></div></div>
    <p class="merci">Merci de votre confiance !</p>
    <div class="pied">${ESS.nom} — ${ESS.rccm}<br>${ESS.adr} • ${ESS.siege}<br>${ESS.banque}<br>🌊 Paiement mobile Wave : ${esc(WAVE)}</div>`;
}
function pdfDoc() {
  const d = docDonnees(), num = getNum(), type = $('#docType').value;
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210;
  if (LOGO_B64) doc.addImage(LOGO_B64, 'PNG', 14, 10, 20, 20);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(26, 47, 79);
  doc.text('ELMANSOUR SUPPLIES & SERVICES', 38, 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(70, 70, 70);
  doc.text('(E.S.S.) — ' + ESS.act, 38, 22); doc.text(ESS.adr, 38, 26.5); doc.text('Tel : ' + ESS.tel, 38, 31);
  doc.setDrawColor(26, 47, 79); doc.setLineWidth(0.8); doc.line(14, 35, W - 14, 35);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(26, 47, 79);
  doc.text(type === 'facture' ? 'FACTURE' : 'DEVIS', 14, 45);
  doc.setFontSize(10); doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'normal');
  doc.text('N° ' + num, 14, 51); doc.text('Date : ' + new Date().toLocaleDateString('fr-FR'), 14, 56);
  doc.text('Mode de paiement : ' + $('#docPaiement').value, 14, 61);
  doc.setFillColor(244, 246, 250); doc.roundedRect(W - 104, 42, 90, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text('FACTURE A / CLIENT', W - 100, 48);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(doc.splitTextToSize($('#docClient').value.trim() || 'Client de passage', 82), W - 100, 54);
  let y = 74;
  doc.setFillColor(26, 47, 79); doc.rect(14, y - 6, W - 28, 8, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('DESIGNATION', 16, y - 1); doc.text('QTE', 122, y - 1, { align: 'right' });
  doc.text('PRIX UNIT.', 152, y - 1, { align: 'right' }); doc.text('MONTANT (FCFA)', W - 16, y - 1, { align: 'right' });
  y += 5; doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  for (const l of d.lines) {
    const t = doc.splitTextToSize(l.nom + ' (' + l.ref + ')', 98); const h = Math.max(t.length * 4.2, 6);
    if (y + h > 255) { doc.addPage(); y = 20; }
    doc.text(t, 16, y); doc.text(String(l.q), 122, y, { align: 'right' });
    doc.text(l.pu ? l.pu.toLocaleString('fr-FR') : 'sur demande', 152, y, { align: 'right' });
    doc.text(l.pu ? (l.pu * l.q).toLocaleString('fr-FR') : '-', W - 16, y, { align: 'right' });
    y += h + 1.5; doc.setDrawColor(225, 229, 236); doc.line(14, y - 1, W - 14, y - 1);
  }
  y += 4; doc.setFillColor(26, 47, 79); doc.roundedRect(W - 74, y, 60, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('TOTAL TTC', W - 72, y + 6.6); doc.text(fmt(d.total) || '', W - 16, y + 6.6, { align: 'right' });
  y += 16; doc.setTextColor(60, 60, 60); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text('Arrêtée la présente ' + (type === 'facture' ? 'facture' : 'offre') + ' à la somme indiquée ci-dessus, en francs CFA.', 14, y);
  doc.setDrawColor(200, 206, 216); doc.line(14, 272, W - 14, 272);
  doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
  doc.text(ESS.nom + ' — ' + ESS.rccm, 14, 277);
  doc.text(ESS.adr + ' • ' + ESS.siege, 14, 281);
  doc.text(ESS.banque, 14, 285);
  doc.text('Paiement mobile Wave : ' + WAVE, 14, 289);
  doc.text('Merci de votre confiance !', 14, 293);
  return { doc, num };
}
function partagePdf() {
  if (!window.jspdf) { alert('Module PDF non chargé.'); return; }
  const { doc, num } = pdfDoc(); const blob = doc.output('blob');
  const f = new File([blob], num + '.pdf', { type: 'application/pdf' });
  $('#docEtat').textContent = '✔ PDF ' + f.name + ' généré';
  if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'ESS ' + num }).catch(() => {});
  else Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: f.name }).click();
}
function enregistreVente() {
  const d = docDonnees(); if (!d.lines.length) return;
  const type = $('#docType').value, num = getNum();
  const entree = { id: num, type, date: new Date().toISOString(), client: $('#docClient').value.trim(),
    paiement: $('#docPaiement').value, total: d.total, marge: d.marge,
    lignes: d.lines.map(l => ({ ref: l.ref, q: l.q, pu: l.pu })) };
  VENTES.push(entree);
  sauve('ess_ventes_v1', VENTES); pousse('vente:' + num, 'vente', entree);
  if (type === 'facture') {
    for (const l of d.lines) { const p = produits().find(x => x.ref === l.ref);
      if (p && p.qte != null && p.qte !== '') { const nq = Math.max(0, +p.qte - l.q);
        EDITS[l.ref] = Object.assign({}, EDITS[l.ref], { qte: nq, stock: nq > 0 ? (p.stock || 'oui') : 'non' });
        pousse('edit:' + l.ref, 'edit', EDITS[l.ref]); } }
    sauve('ess_edits_v1', EDITS); renduChips(); renduListe(true);
  }
  $('#docEtat').textContent = '✔ Enregistré : ' + num + (type === 'facture' ? ' (stock mis à jour)' : '');
  $('#btnEnrVente').disabled = true;
}
function renduJournal() {
  const now = new Date(), aj = now.toISOString().slice(0, 10), mois = aj.slice(0, 7);
  const s7 = new Date(now - 7 * 864e5).toISOString().slice(0, 10);
  const f = VENTES.filter(v => v.type === 'facture');
  const som = l => l.reduce((s, v) => s + (v.total || 0), 0);
  const mg = l => l.reduce((s, v) => s + (v.marge || 0), 0);
  $('#jStats').innerHTML = `
    <div class="stat"><b>${fmt(som(f.filter(v => v.date.slice(0, 10) === aj)))}</b><span>Ventes du jour</span></div>
    <div class="stat"><b>${fmt(som(f.filter(v => v.date.slice(0, 10) >= s7)))}</b><span>7 derniers jours</span></div>
    <div class="stat"><b>${fmt(som(f.filter(v => v.date.slice(0, 7) === mois)))}</b><span>Ce mois-ci</span></div>
    <div class="stat"><b>${fmt(mg(f))}</b><span>Marge cumulée</span></div>`;
  $('#jListe').innerHTML = VENTES.slice().reverse().slice(0, 40).map(v => `
    <div class="jrow"><div><span class="tag ${v.type === 'facture' ? 'f' : 'd'}">${v.type === 'facture' ? 'FACT' : 'DEVIS'}</span>
      <b>${esc(v.id)}</b> · ${esc(v.client || 'client')}<div class="jd">${new Date(v.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${esc(v.paiement)} · ${v.lignes.length} ligne(s)</div></div>
      <b>${fmt(v.total)}</b></div>`).join('') || '<p class="aide">Aucune vente enregistrée pour le moment.</p>';
}
function exportJournal() {
  const tete = 'numero,date,type,client,paiement,total_fcfa,marge_fcfa,lignes';
  const q = v => /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  const lignes = VENTES.map(v => [v.id, v.date, v.type, v.client || '', v.paiement, v.total, v.marge,
    v.lignes.map(l => `${l.q}x ${l.ref}`).join(' + ')].map(x => q(String(x ?? ''))).join(','));
  const blob = new Blob(['\ufeff' + tete + '\n' + lignes.join('\n')], { type: 'text/csv;charset=utf-8' });
  Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `ESS_ventes_${new Date().toISOString().slice(0, 10)}.csv` }).click();
}

/* ---------- synchronisation cloud (Supabase) ---------- */
function syncEtat(s) { const el = $('#syncEtat'); if (!el) return;
  el.className = 'sync ' + s; el.textContent = s === 'err' ? '⛔' : s === 'encours' ? '⌛' : '☁️'; }
async function sbRows() { const r = await fetch(SB.url + '/rest/v1/sync?select=*&limit=5000',
  { headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key } }); if (!r.ok) throw new Error('sb'); return r.json(); }
async function sbPut(id, kind, data) { const r = await fetch(SB.url + '/rest/v1/sync', { method: 'POST',
  headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify([{ id, kind, data, updated_at: new Date().toISOString() }]) }); if (!r.ok) throw new Error('sb'); }
function pousse(id, kind, data) { sbPut(id, kind, data).then(() => syncEtat('ok')).catch(() => syncEtat('err')); }
function appliqueRow(row) {
  const ref = row.id.substring(row.kind.length + 1);
  if (row.kind === 'edit') EDITS[ref] = row.data;
  else if (row.kind === 'new') { NEWS = NEWS.filter(p => p.ref !== ref); NEWS.push(row.data); }
  else if (row.kind === 'del') { if (!DELS.includes(ref)) DELS.push(ref); }
  else if (row.kind === 'vente') { if (!VENTES.some(v => v.id === row.data.id)) VENTES.push(row.data); }
  else if (row.kind === 'cfg') { if (row.data.wa) WA = row.data.wa; if (row.data.wave) WAVE = row.data.wave;
    if (row.data.docnum) { const c = charge('ess_docnum_v1', { fac: 0, dev: 0 });
      c.fac = Math.max(c.fac, row.data.docnum.fac || 0); c.dev = Math.max(c.dev, row.data.docnum.dev || 0);
      sauve('ess_docnum_v1', c); } }
}
let syncEncours = false;
async function tireSync(silencieux) {
  if (syncEncours) return; syncEncours = true; if (!silencieux) syncEtat('encours');
  try {
    const rows = await sbRows(); rows.forEach(appliqueRow);
    sauve('ess_edits_v1', EDITS); sauve('ess_del_v1', DELS); sauve('ess_new_v1', NEWS);
    sauve('ess_ventes_v1', VENTES); sauve('ess_wa_v1', WA); sauve('ess_wave_v1', WAVE);
    renduChips(); renduListe(true); majBadge(); syncEtat('ok');
  } catch (e) { syncEtat('err'); }
  syncEncours = false;
}

/* ---------- diagnostic : si rien ne s'affiche, on explique pourquoi ---------- */
let DERNIERE_ERREUR = null;
window.addEventListener('error', e => { DERNIERE_ERREUR = (e.message || '') + ' @' + (e.filename || '') + ' ligne ' + e.lineno;
  balise('erreur-js', { erreur: DERNIERE_ERREUR }); });
window.addEventListener('unhandledrejection', e => { DERNIERE_ERREUR = 'promesse : ' + (e.reason && e.reason.message ? e.reason.message : e.reason);
  balise('erreur-promesse', { erreur: String(DERNIERE_ERREUR).slice(0, 300) }); });

function diag(msg) {
  const c = $('#compteur');
  c.innerHTML = `<div class="bloc" style="margin:12px; background:#fff; border-radius:12px; padding:14px">
    <h3 style="margin-top:0; color:#c0392b">⚠️ ${esc(msg)}</h3>
    <p>Produits chargés : <b>${BASE.length}</b><br>
       Marqués supprimés : <b>${DELS.length}</b> · modifiés : ${Object.keys(EDITS).length} · ajoutés : ${NEWS.length}<br>
       Après filtres : <b>${vue.liste.length}</b><br>
       Filtres actifs : <code>${esc(JSON.stringify({ q: vue.q, cat: vue.cat, marque: vue.marque, stock: vue.stock, haut: vue.haut }))}</code></p>
    <p>Dernière erreur : <code style="color:#c0392b">${esc(String(DERNIERE_ERREUR || 'aucune')).slice(0, 300)}</code></p>
    <div class="rangeeBtns">
      <button class="btn vert" id="diagFiltres">↺ Réinitialiser les filtres</button>
      <button class="btn rouge" id="diagRaz">🗑 Vider le cache de l'appareil</button>
    </div></div>`;
  try { pousse('diag:' + Date.now(), 'diag', {
    base: BASE.length, supprimes: DELS.length, modifies: Object.keys(EDITS).length, ajoutes: NEWS.length,
    apresFiltres: vue.liste.length, filtres: { q: vue.q, cat: vue.cat, marque: vue.marque, stock: vue.stock, haut: vue.haut },
    erreur: String(DERNIERE_ERREUR || 'aucune').slice(0, 400),
    url: location.href, navigateur: navigator.userAgent.slice(0, 160),
    langue: navigator.language, connexion: navigator.onLine ? 'en ligne' : 'hors ligne',
    memoire: navigator.deviceMemory || '?', quand: new Date().toISOString() }); } catch (e) {}
  const f = document.getElementById('diagFiltres'), r = document.getElementById('diagRaz');
  if (f) f.onclick = () => { vue.q = ''; vue.cat = ''; vue.marque = ''; vue.stock = ''; vue.haut = false;
    const q = document.getElementById('q'); if (q) q.value = '';
    const s = document.getElementById('stockFiltre'); if (s) s.value = '';
    renduChips(); renduListe(true); };
  if (r) r.onclick = async () => {
    if (!confirm('Vider le cache de l\'affichage ?\n\nVos données (ventes, modifications) sont conservées.\nCela corrige les problèmes de page bloquée sur une ancienne version.')) return;
    try { const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
      const ks = await caches.keys(); for (const k of ks) await caches.delete(k); } catch (e) {}
    location.href = location.pathname + '?raz=' + Date.now(); };
}

/* ---------- descriptions (chargees apres l'affichage, pour un demarrage rapide) ---------- */
async function chargeDescs() {
  try {
    const d = await (await fetch('data/desc.json')).json();
    for (const p of BASE) if (d[p.ref]) p.desc = d[p.ref];
    indexe(); renduListe(true);
  } catch (e) { /* hors ligne : les descriptions se chargeront plus tard */ }
}

/* ---------- init ---------- */
async function init() {
  balise('init-demarre', { sw: (navigator.serviceWorker && navigator.serviceWorker.controller) ? 'actif' : 'aucun',
    enLigne: navigator.onLine });
  client = new URLSearchParams(location.search).get('mode') === 'client';
  if (client) { document.body.classList.add('client');
    $('#bandClient').hidden = false; $('#piedClient').hidden = false; $('#btnAdmin').style.display = 'none'; }
  let derniereErreur = '';
  for (const essai of [1, 2, 3]) {
    const ctl = new AbortController();
    const tempo = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch('data/products.json?e=' + essai, { cache: 'reload', signal: ctl.signal });
      clearTimeout(tempo);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const t = await r.text();
      BASE = JSON.parse(t);
      balise('catalogue-charge', { produits: BASE.length, essai: essai, octets: t.length });
      derniereErreur = '';
      break;
    } catch (e) {
      clearTimeout(tempo);
      derniereErreur = (e && e.name === 'AbortError')
        ? 'Le téléchargement reste bloqué plus de 12 secondes'
        : String(e && e.message ? e.message : e);
      balise('echec-catalogue', { essai: essai, erreur: derniereErreur.slice(0, 200), enLigne: navigator.onLine });
      if (essai === 3) {
        document.querySelector('#compteur').innerHTML =
          '<p style="padding:16px;text-align:center;color:#c0392b">Catalogue momentanément indisponible.<br>' +
          '<small style="color:#666">' + derniereErreur.replace(/[<>&]/g, '') + '</small></p>' +
          '<p style="text-align:center"><button class="btn" onclick="location.reload()">🔄 Recharger</button></p>';
        return;
      }
      await new Promise(res => setTimeout(res, 900));
    }
  }
  EDITS = charge('ess_edits_v1', {}); DELS = charge('ess_del_v1', []); NEWS = charge('ess_new_v1', []);
  CART = charge('ess_cart_v1', {}); WA = charge('ess_wa_v1', DEFAULT_WA); VENTES = charge('ess_ventes_v1', []);
  WAVE = charge('ess_wave_v1', DEFAULT_WAVE);
  await tireSync(true);
  balise('sync-termine', { editions: Object.keys(EDITS).length, supprimes: DELS.length });
  $('#edWa').value = WA; $('#edWave').value = WAVE;
  fetch('img/icon-512.png').then(r => r.blob()).then(b => new Promise(res => {
    const rd = new FileReader(); rd.onload = () => res(rd.result); rd.readAsDataURL(b); })).then(d => { LOGO_B64 = d; }).catch(() => {});
  indexe(); majBadge(); renduChips(); renduListe(true);
  chargeDescs();
  balise('rendu-fait', { affiches: vue.liste.length });
  if (!vue.liste.length || location.search.indexOf('diag=1') >= 0) {
    diag(vue.liste.length ? 'Diagnostic demandé' : 'Aucun produit affiché');
  }

  $('#q').addEventListener('input', e => { vue.q = e.target.value.trim(); renduListe(true); });
  $('#stockFiltre').addEventListener('change', e => { vue.stock = e.target.value; renduListe(true); });
  $('#chips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return;
    if (c.dataset.haut) vue.haut = !vue.haut;
    else { vue.cat = c.dataset.cat; if (vue.marque && !produits().some(p => p.marque === vue.marque &&
      (!vue.cat || p.cat.split(' | ')[0] === vue.cat))) vue.marque = ''; }
    renduChips(); renduListe(true); });
  $('#chipsM').addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return;
    vue.marque = c.dataset.m; renduChips(); renduListe(true); });
  window.addEventListener('scroll', () => {
    if ($('#fiche').hidden && $('#panier').hidden && window.innerHeight + window.scrollY > document.body.offsetHeight - 700) renduListe(false);
  });
  $('#grille').addEventListener('click', e => {
    const ed = e.target.closest('[data-ed]');
    if (ed) { e.stopPropagation(); ouvreEdition(ed.dataset.ed); return; }
    const c = e.target.closest('.carte'); if (!c) return;
    if (selMode) { basculeSel(c.dataset.ref, c); return; }
    ouvreFiche(c.dataset.ref);
  });
  $('#btnSel').onclick = () => { selMode = !selMode; if (!selMode) SEL.clear(); majSel(); renduListe(true); };
  $('#selFin').onclick = () => { selMode = false; SEL.clear(); majSel(); renduListe(true); };
  $('#selTout').onclick = () => { filtres().forEach(p => SEL.add(p.ref)); majSel(); renduListe(true); };
  $('#selPanier').onclick = () => { let n = 0;
    for (const r of SEL) { CART[r] = (CART[r] || 0) + 1; n++; }
    sauve('ess_cart_v1', CART); majBadge();
    $('#selInfo').textContent = `🛒 ${n} article${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}`; };
  $('#selPrix').onclick = () => {
    if (!SEL.size) { alert('Sélectionnez d\'abord des articles.'); return; }
    const l = [...SEL].map(r => produits().find(p => p.ref === r)).filter(p => p && prixDe(p) != null);
    $('#prixInfo').textContent = `${SEL.size} article(s) sélectionné(s) — ${l.length} avec un prix.`;
    $('#prixEtat').textContent = ''; $('#panneauPrix').hidden = false; };
  $('#btnFermerPrix').onclick = () => { $('#panneauPrix').hidden = true; };
  $('#btnMargePct').onclick = () => { const pct = +$('#margePct').value; if (!pct) return;
    appliquePrix(p => { const pv = prixDe(p); return pv ? Math.round(pv * (1 + pct / 100) / 100) * 100 : null; }, `Marge de ${pct} %`); };
  $('#btnPrixFixe').onclick = () => { const v = +$('#prixFixe').value; if (!v) return;
    appliquePrix(() => v, `Prix fixe de ${fmt(v)}`); };
  $('#btnMargeAchat').onclick = () => { const pct = +$('#margeAchatPct').value; if (!pct) return;
    appliquePrix(p => p.achat ? Math.round(p.achat * (1 + pct / 100) / 100) * 100 : null, `Marge de ${pct} % sur le prix d'achat`); };
  $('#btnPrixInit').onclick = () => { let n = 0;
    for (const r of SEL) { if (EDITS[r]) { delete EDITS[r].prix; delete EDITS[r].promo;
      if (!Object.keys(EDITS[r]).length) delete EDITS[r];
      pousse('edit:' + r, 'edit', EDITS[r] || {}); n++; } }
    sauve('ess_edits_v1', EDITS); indexe(); renduListe(true); majEtat();
    $('#prixEtat').textContent = `✔ ${n} fiche(s) rétablie(s) au prix d'origine`; };
  $('#selShare').onclick = () => {
    const P = new Map(produits().map(p => [p.ref, p]));
    const l = [...SEL].map(r => P.get(r)).filter(Boolean); if (!l.length) return;
    const txt = '🛍 Catalogue ESS — sélection\n\n' +
      l.map((p, i) => `${i + 1}. ${p.nom} — ${prixDe(p) != null ? fmt(prixDe(p)) : 'prix sur demande'} (réf. ${p.ref})`).join('\n') +
      '\n\nESS · Elmansour Supplies & Services\nKeur Massar Nord, Dakar · +221 77 747 77 78';
    if (navigator.share) navigator.share({ text: txt }).catch(() => {});
    else location.href = 'https://wa.me/?text=' + encodeURIComponent(txt); };
  $('#btnRetour').onclick = () => { $('#fiche').hidden = true; };

  /* panier */
  $('#btnPanier').onclick = () => { renduPanier(); $('#panier').hidden = false; };
  $('#btnFermerPanier').onclick = () => $('#panier').hidden = true;
  $('#panierListe').addEventListener('click', e => {
    const r = e.target.dataset.p || e.target.dataset.m || e.target.dataset.x; if (!r) return;
    if (e.target.dataset.p) CART[r] += 1;
    else if (e.target.dataset.m) CART[r] = Math.max(0, CART[r] - 1);
    else if (e.target.dataset.x) CART[r] = 0;
    if (!CART[r]) delete CART[r];
    sauve('ess_cart_v1', CART); majBadge(); renduPanier();
  });
  $('#btnWa').onclick = commandeWhatsApp;
  $('#btnVider').onclick = () => { CART = {}; sauve('ess_cart_v1', CART); majBadge(); renduPanier(); };
  $('#btnDoc').onclick = () => { if (!Object.keys(CART).length) { alert('Panier vide : ajoutez d\'abord un article.'); return; }
    $('#docClient').value = $('#nomClient').value; docNum = null; $('#docEtat').textContent = '';
    $('#btnEnrVente').disabled = false; $('#doc').hidden = false; };
  $('#btnFermerDoc').onclick = () => $('#doc').hidden = true;
  $('#docType').addEventListener('change', () => { docNum = null; });
  $('#btnApercu').onclick = () => { remplisDoc(); window.print(); };
  $('#btnPdfShare').onclick = partagePdf;
  $('#btnEnrVente').onclick = enregistreVente;
  $('#btnJournal').onclick = () => { renduJournal(); $('#journal').hidden = false; };
  $('#btnFermerJournal').onclick = () => $('#journal').hidden = true;
  $('#btnJExport').onclick = exportJournal;

  /* gestion */
  $('#btnAdmin').onclick = () => {
    if (admin) { admin = false; sauve('ess_admin_v1', false); $('#panneauAdmin').hidden = true; majEtat(); return; }
    const c = prompt('Code d\'accès gestion :'); if (c === null) return;
    if (c.trim() !== PIN) { alert('Code incorrect.'); return; }
    admin = true; sauve('ess_admin_v1', true); $('#panneauAdmin').hidden = false; majEtat(); };
  $('#lienGestion').onclick = e => { e.preventDefault();
    const c = prompt('Code d\'accès gestion :'); if (c === null) return;
    if (c.trim() !== PIN) { alert('Code incorrect.'); return; }
    sauve('ess_admin_v1', true); location.href = location.pathname; };
  $('#edPin').value = PIN;
  $('#edPin').addEventListener('change', e => { PIN = (e.target.value || '').trim() || '2026';
    sauve('ess_pin_v1', PIN); $('#adminEtat').textContent = '✔ Code d\'accès mis à jour — ne l\'oubliez pas'; });
  $('#btnFermerAdmin').onclick = () => $('#panneauAdmin').hidden = true;
  $('#btnFermerEd').onclick = () => $('#edition').hidden = true;
  $('#btnAjouter').onclick = () => ouvreEdition(null);
  $('#btnExport').onclick = exportCSV;
  $('#edWa').addEventListener('change', e => { WA = e.target.value.replace(/\D/g, ''); sauve('ess_wa_v1', WA);
    pousse('cfg:wa', 'cfg', { wa: WA }); $('#adminEtat').textContent = '✔ Numéro WhatsApp des commandes mis à jour'; });
  $('#edWave').addEventListener('change', e => { WAVE = e.target.value.trim(); sauve('ess_wave_v1', WAVE);
    pousse('cfg:wave', 'cfg', { wave: WAVE }); $('#adminEtat').textContent = '✔ Lien Wave mis à jour'; });
  $('#btnWave').onclick = () => { if (!Object.keys(CART).length) { alert('Panier vide.'); return; } window.open(WAVE, '_blank'); };
  $('#btnWaveClient').onclick = () => {
    const d = docDonnees(); if (!d.lines.length) return;
    const cli = $('#docClient').value.trim();
    const msg = `Bonjour${cli ? ' ' + cli : ''}, votre ${$('#docType').value} ESS d'un montant de *${fmt(d.total)}* est prêt.\n` +
      `🌊 Réglez par Wave en un clic : ${WAVE}\nMerci de votre confiance ! — ESS · Elmansour Supplies & Services`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  $('#btnReset').onclick = () => { if (confirm('Supprimer toutes vos modifications locales ?')) {
    EDITS = {}; DELS = []; NEWS = []; sauve('ess_edits_v1', EDITS); sauve('ess_del_v1', DELS); sauve('ess_new_v1', NEWS);
    renduChips(); renduListe(true); majEtat(); } };
  $('#btnEnregistrer').onclick = () => {
    const val = { nom: $('#edNom').value.trim(), cat: $('#edCat').value.trim(),
      prix: $('#edPrix').value ? +$('#edPrix').value : null,
      promo: $('#edPromo').value ? +$('#edPromo').value : null,
      achat: $('#edAchat').value ? +$('#edAchat').value : null,
      qte: $('#edQte').value !== '' ? +$('#edQte').value : null,
      stock: $('#edStock').value };
    if (!val.nom) { alert('Le nom du produit est obligatoire.'); return; }
    const fin = f => {
      if (refCourante && BASE.concat(NEWS).some(p => p.ref === refCourante)) {
        EDITS[refCourante] = Object.assign({}, EDITS[refCourante], f ? { img: f } : {}, val);
        sauve('ess_edits_v1', EDITS); pousse('edit:' + refCourante, 'edit', EDITS[refCourante]);
      } else {
        const ref = 'ESS-N' + String(NEWS.length + 1).padStart(3, '0');
        const obj = Object.assign({ ref, pinfo: '', dim: '', desc: '',
          img: f || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#fff"/></svg>') }, val);
        NEWS.push(obj); sauve('ess_new_v1', NEWS); pousse('new:' + ref, 'new', obj);
      }
      $('#edition').hidden = true; renduChips(); renduListe(true); majEtat();
      $('#adminEtat').textContent = '✔ Enregistré sur cet appareil';
    };
    const f = $('#edPhoto').files[0];
    if (f) photoVersData(f, fin); else fin(null);
  };
  $('#btnSupprimer').onclick = () => { if (refCourante && confirm('Supprimer ce produit du catalogue local ?')) {
    DELS.push(refCourante); sauve('ess_del_v1', DELS); pousse('del:' + refCourante, 'del', { ref: refCourante });
    $('#edition').hidden = true; $('#fiche').hidden = true; renduChips(); renduListe(true); majEtat(); } };

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost'))
    navigator.serviceWorker.register('sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; $('#installBand').hidden = false; });
  $('#btnInstall').onclick = async () => { if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; }
    $('#installBand').hidden = true; };
  $('#btnIgnore').onclick = () => $('#installBand').hidden = true;
  $('#syncEtat').onclick = () => tireSync(false);
  setInterval(() => tireSync(true), 20000);
}
Promise.resolve().then(init).then(() => balise('init-termine', { produits: BASE.length, affiches: vue.liste.length }))
  .catch(e => {
    DERNIERE_ERREUR = 'init : ' + (e && e.message ? e.message : String(e));
    balise('erreur-init', { erreur: String(DERNIERE_ERREUR).slice(0, 400) });
    const c = document.getElementById('compteur');
    if (c) c.innerHTML = '<div style="padding:14px;color:#c0392b">Erreur au demarrage :<br>' +
      String(DERNIERE_ERREUR).replace(/[<>&]/g, '') + '</div>';
  });
