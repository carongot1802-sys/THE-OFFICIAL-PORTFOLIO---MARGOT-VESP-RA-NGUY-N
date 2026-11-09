import { CONFIG } from './config.js?v=10';

/* Hàm gộp đối tượng, giữ lại để dùng khi cần. */
export function mergeDeep(base, over) {
  if (Array.isArray(over)) return over;
  if (over && typeof over === 'object' && base && typeof base === 'object' && !Array.isArray(base)) {
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = k in base ? mergeDeep(base[k], over[k]) : over[k];
    return out;
  }
  return over === undefined ? base : over;
}

/* Font có sẵn để chọn. custom = không có trên Google Fonts, phải tải file font lên trong trang quản trị */
export const FONT_OPTIONS = {
  heading: [
    { label: 'Fraunces', family: 'Fraunces', weight: 600, google: 'Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700', local: true },
    { label: 'Cormorant Garamond', family: 'Cormorant Garamond', weight: 700, google: 'Cormorant+Garamond:wght@600;700' },
    { label: 'Amarego', family: 'Amarego', weight: 700, custom: true },
    { label: 'Assox', family: 'Assox', weight: 700, custom: true },
    { label: 'Best Swashed', family: 'Best Swashed', weight: 700, custom: true },
    { label: 'Playfair Display', family: 'Playfair Display', weight: 700, google: 'Playfair+Display:wght@600;700' },
    { label: 'Lora', family: 'Lora', weight: 700, google: 'Lora:wght@600;700' }
  ],
  body: [
    { label: 'EB Garamond (hệ font của chương trình)', family: 'EB Garamond VN', weight: 400, local: true },
    { label: 'Be Vietnam Pro', family: 'Be Vietnam Pro', weight: 400, google: 'Be+Vietnam+Pro:wght@400;500;600' },
    { label: 'Montserrat', family: 'Montserrat', weight: 400, google: 'Montserrat:wght@400;500;600' },
    { label: 'Rokkitt', family: 'Rokkitt', weight: 400, google: 'Rokkitt:wght@400;500;600' },
    { label: 'Beautique Display Condensed', family: 'Beautique Display Condensed', weight: 400, custom: true },
    { label: 'EB Garamond Medium', family: 'EB Garamond', weight: 500, google: 'EB+Garamond:wght@400;500;600' }
  ]
};

function normalise(c) {
  const m = c.moodboard;
  if (Array.isArray(m.fonts)) m.fonts = { title: [], body: [] };
  m.fonts = { title: [], body: [], ...m.fonts };
  m.visualCue = (m.visualCue || []).filter(g => g.images); m.elements = (m.elements || []).filter(g => g.images);
  m.products = m.products || {}; m.products.backdrop = m.products.backdrop || []; m.products.poster = m.products.poster || [];
  const names = new Set(c.theme.customFonts.map(f => f.name));
  CONFIG.theme.customFonts.forEach(f => { if (!names.has(f.name)) c.theme.customFonts.push({ ...f }); });
  c.zones.forEach(z => { delete z.refs; });
  (c.scene.foods || []).forEach(f => { if (f.kind === 'drink') { f.kind = 'nem'; if (!f.name || /nước/i.test(f.name)) f.name = 'Nem rán'; } });
  return c;
}

export async function loadConfig() {
  return normalise(JSON.parse(JSON.stringify(CONFIG)));
}

const addLink = href => {
  if ([...document.querySelectorAll('link[rel=stylesheet]')].some(l => l.href === href)) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
};

/* Áp font và màu chữ lên toàn trang, đồng thời trả về chuỗi font dùng cho chữ trong 3D */
export function applyTheme(c) {
  const t = c.theme;
  const find = (list, label) => list.find(o => o.label === label) || list[0];
  const h = find(FONT_OPTIONS.heading, t.headingFont), b = find(FONT_OPTIONS.body, t.bodyFont);
  const style = document.createElement('style');
  let css = '';
  [h, b].forEach(o => {
    if (o.google && !o.local) addLink(`https://fonts.googleapis.com/css2?family=${o.google}&display=swap`);
    if (o.custom) {
      const cf = t.customFonts.find(f => f.name === o.label);
      if (cf && cf.file) css += `@font-face{font-family:'${o.family}';src:url('${cf.file}');font-display:swap;font-weight:100 900;}\n`;
    }
  });
  const hasFile = o => !o.custom || !!(t.customFonts.find(f => f.name === o.label) || {}).file;
  const fd = `'${h.family}'${hasFile(h) ? '' : ", 'Fraunces'"}, Georgia, serif`;
  const fb = b.local ? `'${b.family}', 'EB Garamond', Georgia, serif` : `'${b.family}'${hasFile(b) ? '' : ", 'Be Vietnam Pro'"}, system-ui, sans-serif`;
  const root = document.documentElement.style;
  root.setProperty('--font-display', fd);
  root.setProperty('--font-body', fb);
  root.setProperty('--font-body-weight', String(b.weight));
  const col = t.colors;
  const map = { brand: '--c-brand', heroTitle: '--c-hero-title', heroText: '--c-hero-text', pageTitle: '--c-h2', sectionTitle: '--c-h3', body: '--c-body', thanksTitle: '--c-thanks-title', thanksText: '--c-thanks-text', footer: '--c-foot' };
  Object.entries(map).forEach(([k, v]) => { if (col[k]) root.setProperty(v, col[k]); });
  style.textContent = css; document.head.appendChild(style);
  t._fd = fd.replace(/'/g, '"'); t._fb = fb.replace(/'/g, '"'); t._fdw = h.weight;
  t._families = [h, b].map(o => o.family);
}

export function loadFonts() { /* giữ lại để tương thích bản cũ */ }
