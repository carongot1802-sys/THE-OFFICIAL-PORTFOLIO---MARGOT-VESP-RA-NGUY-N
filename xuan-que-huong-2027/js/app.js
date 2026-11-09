import { loadConfig, applyTheme } from './content.js?v=10';
import { assemble, foldOpen } from './asm.js';

const C = await loadConfig();
applyTheme(C);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, attrs = {}, html = '') => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ROUTES = ['/', '/moodboard', '/khong-gian', '/cam-on'];
let current = null;
const inited = new Set();
let space = null;
const rearm = {};   // đưa hiệu ứng cuộn về trạng thái ban đầu để chạy lại khi quay lại mục

/* ================= Định tuyến ================= */
function routeFromHash() {
  const h = location.hash.replace(/^#/, '') || '/';
  return ROUTES.includes(h) ? h : '/';
}

function show(route) {
  if (route === current) return;
  const prev = current;
  current = route;
  $$('.view').forEach(v => v.classList.toggle('is-active', v.dataset.route === route));
  const idx = ROUTES.indexOf(route);
  $$('#stepper a').forEach(a => {
    const s = Number(a.dataset.step);
    a.classList.toggle('active', s === idx);
    a.classList.toggle('done', s < idx);
    if (s === idx) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const active = $('#stepper a.active');
  if (active) active.scrollIntoView({ inline: 'center', block: 'nearest' });
  window.scrollTo(0, 0);

  if (prev === '/moodboard') { if (rearm.moodboard) rearm.moodboard(); window.dispatchEvent(new Event('asm-reset')); }
  if (prev === '/khong-gian' && space) { space.api.stop(); space.tourStop(); }
  if (route === '/moodboard') initOnce('moodboard', initMoodboard);
  if (route === '/khong-gian') { if (space) space.api.start(); else initSpace(); }
}
function initOnce(key, fn) { if (inited.has(key)) return; inited.add(key); fn(); }

/* ================= Chữ chung ================= */
function initText() {
  document.title = `${C.eventName}, moodboard, ấn phẩm và không gian 3D`;
  $('#heroOrg').textContent = C.org;
  $('#heroEvent').textContent = C.eventSub;
  $('#heroCredit').textContent = C.credit || '';
  $('#heroBtn').textContent = C.hero.button || 'Bắt đầu xem';
  $('#mTitle').textContent = C.moodboard.title;
  $('#mLead').textContent = C.moodboard.lead;
  $('#thOrg').textContent = C.org;
  $('#thTitle').textContent = C.thanks.title;
  $('#thMsg').textContent = C.thanks.message;
  $('#thSign').textContent = C.thanks.sign;
  $('#siteFoot').textContent = C.footer;
}

function initHero() {
  const hero = $('#hero');
  hero.style.setProperty('--hero-fit', C.hero.fit || 'cover');
  if (C.hero.art) {                                   // poster key visual đặt bên phải trang mở đầu
    const a = new Image();
    a.onload = () => { $('#heroArtImg').src = C.hero.art; $('#heroArt').hidden = false; hero.classList.add('has-art'); };
    a.src = C.hero.art;
  }
  if (!C.hero.image) return;
  const img = new Image();
  img.onload = () => {
    hero.style.setProperty('--hero-img', `url("${C.hero.image}")`);
    hero.classList.add('has-image');
  };
  img.src = C.hero.image;
}

async function fileExists(url) {
  if (!/^https?:$/.test(location.protocol)) return true;
  try { return (await fetch(url, { method: 'HEAD' })).ok; } catch { return false; }
}

const rearmFns = {};
function initReveal(rootSel) {
  const root = $(rootSel), items = $$(rootSel + ' .rv');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { items.forEach(i => i.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0 });
  root.classList.add('rv-on');
  items.forEach(i => io.observe(i));
  rearmFns[rootSel] = () => { root.classList.add('rv-on'); items.forEach(i => { i.classList.remove('in'); io.observe(i); }); };
  setTimeout(() => { if (!items.some(i => i.classList.contains('in'))) root.classList.remove('rv-on'); }, 2000);   // phòng khi trình duyệt không báo
}

/* ================= Moodboard ================= */
const viewer = { items: [], i: 0 };
function showViewer() {
  const it = viewer.items[viewer.i];
  $('#lightboxImg').src = it.src; $('#lightboxImg').alt = it.caption || '';
  $('#lightboxCap').textContent = it.caption || '';
  $('#lbCount').textContent = viewer.items.length > 1 ? `${viewer.i + 1} / ${viewer.items.length}` : '';
  $('#lbPrev').hidden = $('#lbNext').hidden = viewer.items.length < 2;
}
function openViewer(items, i = 0) {
  viewer.items = items; viewer.i = i; showViewer();
  const d = $('#lightbox'); if (!d.open) d.showModal();
}
const moveViewer = d => { viewer.i = (viewer.i + d + viewer.items.length) % viewer.items.length; showViewer(); };
function imageFigure(item, group) {
  const fig = el('figure');
  const img = el('img', { src: item.src, alt: item.caption || '', loading: 'lazy', tabindex: '0' });
  const open = () => openViewer(group, group.indexOf(item));
  img.addEventListener('click', open);
  img.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
  fig.appendChild(img);
  if (item.caption) fig.appendChild(el('figcaption', { class: 'cap' }, esc(item.caption)));
  return fig;
}
const placeholder = (title, hint) => el('div', { class: 'ph' }, `<b>${esc(title)}</b><span>${esc(hint)}</span>`);

function fillGallery(host, items, hintTitle, hintText, n = 4) {
  const group = items.filter(it => it.src);
  if (group.length) group.forEach(it => host.appendChild(imageFigure(it, group)));
  else for (let i = 0; i < n; i++) host.appendChild(placeholder(hintTitle, hintText));
}

function initToc(navSel = '#toc', route = '/moodboard') {
  const btns = $$(navSel + ' button');
  const secs = btns.map(b => $('#' + b.dataset.target));
  btns.forEach(b => b.onclick = () => { const t = $('#' + b.dataset.target); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  const mark = () => {
    const y = window.innerHeight * 0.32;
    let cur = 0;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < y) cur = i; });
    btns.forEach((b, i) => b.classList.toggle('on', i === cur));
  };
  window.addEventListener('scroll', () => { if (current === route) mark(); }, { passive: true });
  mark();
}

function initMoodboard() {
  try { buildMood(); } catch (err) {
    console.error(err);
    $('#moodBody').innerHTML = `<p class="pintro">Không dựng được trang Moodboard (${esc(err.message)}). Hãy tải lại trang bằng Ctrl+F5.</p>`;
  }
}

/* Tách chú thích "Tên: mô tả" thành tiêu đề ngắn và đoạn mô tả */
function splitCap(c) {
  const t = String(c || ''), i = t.indexOf(': ');
  return i > 0 && i < 44 ? { head: t.slice(0, i), text: t.slice(i + 2) } : { head: '', text: t };
}
function board(item, group, cls = '') {
  const fig = el('figure', { class: 'board rv ' + cls });
  const img = el('img', { src: item.src, alt: item.caption || '', loading: 'lazy', tabindex: '0' });
  const open = () => openViewer(group, group.indexOf(item));
  img.addEventListener('click', open);
  img.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
  fig.appendChild(el('span', { class: 'board-img' }));
  fig.firstChild.appendChild(img);
  return fig;
}
function asmBoard(kind, item, group, cls) {
  const fig = el('figure', { class: 'board rv ' + cls });
  const w = assemble(kind, item.src, () => openViewer(group, group.indexOf(item)));
  fig.appendChild(w);
  return fig;
}
function foldBoard(item, group, cls, folds) {
  const fig = el('figure', { class: 'board rv ' + cls });
  fig.appendChild(foldOpen(item.src, folds, () => openViewer(group, group.indexOf(item))));
  return fig;
}
function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#2a0709' : '#fff';
}

function groupsOf(arr) {
  return (arr || []).map(g => g && g.images ? { title: g.title || '', text: g.text || '', images: g.images.filter(x => x && x.src) } : null).filter(g => g && g.images.length);
}
function kitView(groups) {
  const all = []; groups.forEach(g => g.images.forEach(i => all.push(i)));
  const wrapAll = el('div', { class: 'kit' });
  groups.forEach((g, gi) => {
    const card = el('article', { class: 'kitg rv' + (/ẩm thực/i.test(g.title) ? ' kit-sm' : '') });
    card.appendChild(el('header', { class: 'kitg-head' }, `<b>${esc(g.title)}</b>${g.text ? `<p>${esc(g.text)}</p>` : ''}`));
    const field = el('div', { class: 'kitg-field' });
    g.images.forEach((it, i) => {
      const ar = it.w && it.h ? it.w / it.h : 1;
      const tile = el('button', { type: 'button', class: 'kit-tile', style: `--ar:${ar};--i:${i};--d:${(i * 0.7 + gi * 0.4).toFixed(2)}s`, 'aria-label': it.caption || 'Xem hình' });
      const img = el('img', { src: it.src, alt: it.caption || '', loading: 'lazy', draggable: 'false' });
      img.addEventListener('load', () => { if (img.naturalWidth) tile.style.setProperty('--ar', img.naturalWidth / img.naturalHeight); });
      tile.appendChild(img);
      if (it.caption) tile.appendChild(el('small', {}, esc(it.caption)));
      tile.addEventListener('click', () => openViewer(all, all.indexOf(it)));
      field.appendChild(tile);
    });
    card.appendChild(field);
    wrapAll.appendChild(card);
  });
  return wrapAll;
}

function buildMood() {
  const m = C.moodboard, pr = m.products || {}, br = C.brochure || {};
  $('#mTitle').textContent = m.title; $('#mLead').textContent = m.lead;
  const ok = a => (a || []).filter(x => x && x.src);
  const sections = [];
  const add = (id, label, title, body) => { if (body) sections.push({ id, label, title, body }); };
  const wrap = (cls, nodes) => { const d = el('div', { class: cls }); nodes.forEach(n => d.appendChild(n)); return d; };
  const capOf = (it, cls = '') => {
    const c = splitCap(it.caption);
    return el('figcaption', { class: 'cap2 ' + cls }, (c.head ? `<b>${esc(c.head)}</b>` : '') + (c.text ? `<span>${esc(c.text)}</span>` : ''));
  };

  // 1. Ý tưởng tổng quan
  const idea = ok(m.images);
  if (idea.length) add('sec-mood', 'Ý tưởng tổng quan', 'Ý tưởng tổng quan', wrap('stack', idea.map(it => {
    const f = board(it, idea, 'wide'); f.appendChild(capOf(it)); return f; })));

  // 2. Bảng màu
  if ((m.palette || []).length) {
    const grid = el('div', { class: 'palette rv' });
    m.palette.forEach((p, i) => grid.appendChild(el('div', { class: 'swatch', style: `--i:${i}` },
      `<div class="chip" style="--c:${esc(p.hex)};--ink:${inkOn(p.hex)}"><span>${esc(p.hex)}</span></div><div class="sw-txt"><b>${esc(p.name)}</b><small>${esc(p.role)}</small></div>`)));
    add('sec-palette', 'Bảng màu', 'Bảng màu', grid);
  }

  // 3. Visual cue
  const cueG = groupsOf(m.visualCue);
  if (cueG.length) { const kv = kitView(cueG); kv.classList.add('kit-vc'); add('sec-vcue', 'Visual cue', 'Visual cue', kv); }
  // 4. Key visual
  if (m.keyVisual && m.keyVisual.image) {
    const kv = el('div', { class: 'keyv rv' });
    const group = [{ src: m.keyVisual.image, caption: 'Key visual của chương trình' }];
    const fig = el('figure', { class: 'poster-frame' }); const img = el('img', { src: group[0].src, alt: 'Key visual', loading: 'lazy', tabindex: '0' });
    img.addEventListener('click', () => openViewer(group, 0)); img.addEventListener('keydown', e => { if (e.key === 'Enter') openViewer(group, 0); });
    fig.appendChild(img); kv.appendChild(fig);
    kv.appendChild(el('div', { class: 'keyv-text' }, `<p>${esc(m.keyVisual.caption)}</p>`));
    add('sec-key', 'Key visual', 'Key visual', kv);
  }

  // 5. Font
  const fonts = [...ok(m.fonts.title), ...ok(m.fonts.body)];
  const fwrap = el('div', { class: 'stack' });
  fonts.forEach(it => { const f = board(it, fonts, 'wide'); if (it.caption) f.appendChild(capOf(it)); fwrap.appendChild(f); });
  add('sec-font', 'Font', 'Font', fwrap);

  // 6. Elements
  const elG = groupsOf(m.elements);
  if (elG.length) { const kv = kitView(elG); kv.classList.add('kit-el'); add('sec-elements', 'Elements', 'Elements', kv); }

  // 7. Sản phẩm truyền thông
  const prod = el('div', { class: 'prod' });
  const bd = ok(pr.backdrop), po = ok(pr.poster);
  const sides = [{ src: br.front, caption: (br.frontLabel || 'Mặt tiếng Việt') }, { src: br.back, caption: (br.backLabel || 'Mặt tiếng Pháp') }].filter(x => x.src);
  const sub = t => el('h4', { class: 'msub rv' }, esc(t));
  if (bd.length) { prod.appendChild(sub('Phông nền sân khấu')); bd.forEach(it => { const f = asmBoard('backdrop', it, bd, 'wide light'); f.appendChild(capOf(it)); prod.appendChild(f); }); }
  if (sides.length) {
    prod.appendChild(sub(br.title || 'Brochure'));
    const g = el('div', { class: 'duo' });
    sides.forEach((it, si) => { const f = foldBoard(it, sides, 'light', si ? [0, 672, 1346, 2000] : [0, 655, 1330, 2000]); f.appendChild(capOf(it)); g.appendChild(f); });
    prod.appendChild(g);
  }
  if (po.length) { prod.appendChild(sub('Poster Facebook')); const g = el('div', { class: 'solo' }); po.forEach(it => { const f = asmBoard('poster', it, po, 'light'); f.appendChild(capOf(it)); g.appendChild(f); }); prod.appendChild(g); }
  if (prod.childNodes.length) add('sec-products', 'Sản phẩm truyền thông', 'Sản phẩm truyền thông', prod);

  const body = $('#moodBody'), nav = $('#toc');
  body.innerHTML = ''; nav.innerHTML = '';
  if (!sections.length) { body.innerHTML = '<p class="pintro">Chưa có nội dung moodboard. Thêm ảnh trong trang quản trị, mục Moodboard.</p>'; return; }
  sections.forEach((sc, i) => {
    const n = String(i + 1).padStart(2, '0');
    const s = el('section', { class: 'msec', id: sc.id });
    s.appendChild(el('header', { class: 'mhead rv' }, `<span class="mno">${n}</span><h3>${esc(sc.title)}</h3>`));
    s.appendChild(sc.body);
    body.appendChild(s);
    nav.appendChild(el('button', { type: 'button', 'data-target': sc.id, class: i ? '' : 'on' }, esc(sc.label)));
  });
  initToc('#toc', '/moodboard');
  initReveal('#moodBody');
  rearm.moodboard = () => rearmFns['#moodBody'] && rearmFns['#moodBody']();
}
$('#lightboxClose').onclick = () => $('#lightbox').close();
$('#lbPrev').onclick = () => moveViewer(-1);
$('#lbNext').onclick = () => moveViewer(1);
$('#lightbox').addEventListener('keydown', e => { if (e.key === 'ArrowLeft') moveViewer(-1); if (e.key === 'ArrowRight') moveViewer(1); });
(() => { let x0 = null; const lb = $('#lightbox');
  lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50 && viewer.items.length > 1) moveViewer(dx < 0 ? 1 : -1); }); })();
$('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') e.currentTarget.close(); });

/* ================= Hái lộc đầu xuân ================= */
const locBag = { order: [], last: -1 };
function nextLoc() {
  const list = (C.scene.lixiMessages || []).filter(x => String(x).trim());
  if (!list.length) return 'Chúc bạn một năm mới an khang.';
  if (locBag.order.length === 0 || locBag.n !== list.length) {
    // xáo trộn Fisher-Yates, đảm bảo thông điệp đầu của lượt mới không trùng thông điệp cuối của lượt trước
    const a = list.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.length > 1 && a[a.length - 1] === locBag.last) [a[0], a[a.length - 1]] = [a[a.length - 1], a[0]];
    locBag.order = a; locBag.n = list.length;
  }
  const i = locBag.order.pop(); locBag.last = i;
  return list[i];
}
const cardBag = { order: [], last: -1 };
function nextCard() {
  const imgs = (C.scene.lixiCards || []).map(x => (typeof x === 'string' ? x : x && x.src)).filter(Boolean);
  if (!imgs.length) return '';
  if (!cardBag.order.length) {
    const a = imgs.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.length > 1 && a[a.length - 1] === cardBag.last) [a[0], a[a.length - 1]] = [a[a.length - 1], a[0]];
    cardBag.order = a;
  }
  const i = cardBag.order.pop(); cardBag.last = i; return imgs[i];
}
function openLoc() {
  const d = $('#locDlg'), card = $('#locCard');
  $('#locTitle').textContent = C.scene.lixiTitle || 'Hái lộc đầu xuân';
  const msg = nextLoc();
  $('#locMsg').innerHTML = esc(msg).split('\n').map(l => `<span>${l}</span>`).join('');
  const img = nextCard();
  card.classList.toggle('has-img', !!img);
  $('#locImg').src = img || '';
  card.dataset.pos = C.scene.lixiTextPos || 'middle';
  card.style.setProperty('--loc-ink', C.scene.lixiTextColor || '#fbe9b8');
  const sp = $('#locSparks');
  if (!sp.childElementCount) for (let i = 0; i < 18; i++) {
    const e = document.createElement('i');
    e.style.cssText = `left:${6 + Math.random() * 88}%;top:${8 + Math.random() * 84}%;--d:${(Math.random() * 1.2).toFixed(2)}s;--s:${(0.5 + Math.random() * 0.9).toFixed(2)}`;
    sp.appendChild(e);
  }
  card.classList.remove('reveal'); void card.offsetWidth; card.classList.add('reveal');
  if (!d.open) d.showModal();
}
$('#locAgain').onclick = openLoc;
$('#locClose').onclick = () => $('#locDlg').close();
$('#locDlg').addEventListener('click', e => { if (e.target.id === 'locDlg') e.currentTarget.close(); });

/* ================= Brochure: lật hai mặt, cầm theo ================= */
let held = false;
try { held = sessionStorage.getItem('brochureHeld') === '1'; } catch (e) { /* bỏ qua */ }
let broSide = 0, broOpen = false, broTimer = 0;
const broWait = (fn, ms) => { clearTimeout(broTimer); broTimer = setTimeout(fn, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms); };
function broRender() {
  const b = C.brochure || {};
  $('#broStage').classList.toggle('open', broOpen);
  $('#broFlip').classList.toggle('flipped', broSide === 1);
  $('#broLabel').textContent = !broOpen ? (b.closedLabel || 'Brochure gấp ba, đang gập lại') : broSide ? (b.backLabel || 'Mặt sau') : (b.frontLabel || 'Mặt trước');
  $('#broFold').textContent = broOpen ? 'Gập lại' : 'Mở brochure';
  $('#broTake').textContent = held ? 'Bỏ brochure xuống' : 'Cầm theo brochure';
  $('#broTake').classList.toggle('btn-gold', !held);
  $('#broTake').classList.toggle('btn-line', held);
  $('#heldChip').hidden = !held || !space;
}
// mở ra theo hai nếp gấp, gập lại thì lật về mặt trước rồi mới khép
function broUnfold(then) { broOpen = true; broRender(); if (then) broWait(then, 1300); }
function broFoldUp() {
  if (broSide) { broSide = 0; broRender(); broWait(() => { broOpen = false; broRender(); }, 800); }
  else { broOpen = false; broRender(); }
}
function broTurnOver() {
  const b = C.brochure || {};
  if (!(b.front && b.back)) return;
  if (!broOpen) { broUnfold(() => { broSide = 1; broRender(); }); return; }
  broSide = broSide ? 0 : 1; broRender();
}
function openBrochure(side = 0) {
  const b = C.brochure || {};
  const u = s => { let a = String(s || ''); try { a = new URL(a, document.baseURI).href; } catch (e) { /* giữ nguyên */ } return `url("${a.replace(/"/g, '%22')}")`; };
  const st = $('#broStage').style;
  st.setProperty('--bf', u(b.front)); st.setProperty('--bb', u(b.back || b.front));
  $('#broNote').textContent = b.note || '';
  $('#broTurn').hidden = !(b.front && b.back);
  broSide = 0; broOpen = false; broRender();
  const d = $('#broDlg'); if (!d.open) d.showModal();
  broWait(() => broUnfold(side ? () => { broSide = 1; broRender(); } : null), 450);
}
$('#broTurn').onclick = broTurnOver;
$('#broFold').onclick = () => { clearTimeout(broTimer); broOpen ? broFoldUp() : broUnfold(); };
$('#broStage').onclick = () => { clearTimeout(broTimer); broOpen ? broTurnOver() : broUnfold(); };
$('#broTake').onclick = () => {
  held = !held;
  try { sessionStorage.setItem('brochureHeld', held ? '1' : '0'); } catch (e) { /* bỏ qua */ }
  broRender();
  if (held) $('#broDlg').close();
};
$('#broClose').onclick = () => $('#broDlg').close();
$('#broDlg').addEventListener('close', () => clearTimeout(broTimer));
$('#broDlg').addEventListener('click', e => { if (e.target.id === 'broDlg') e.currentTarget.close(); });
$('#heldChip').onclick = () => openBrochure(0);

/* ================= Không gian 3D ================= */
const VIEW_BUTTONS = [['overview', 'Toàn cảnh'], ['gate', 'Từ cổng vào'], ['audience', 'Góc khán giả'], ['stage', 'Từ sân khấu'], ['top', 'Nhìn từ trên cao']];

async function initSpace() {
  const loading = $('#spaceLoading');
  let mod;
  try { mod = await import('./scene3d.js?v=10'); }
  catch (err) {
    console.error(err);
    loading.textContent = 'Không tải được thư viện 3D. Hãy kiểm tra kết nối mạng rồi tải lại trang.';
    return;
  }
  try {
    await Promise.race([
      Promise.all([
        ...C.theme._families.flatMap(f => [document.fonts.load(`700 40px "${f}"`, 'Xuân Quê hương Đinh Mùi ĐẠI SỨ QUÁN'), document.fonts.load(`400 40px "${f}"`, 'Xuân Quê hương Đinh Mùi ĐẠI SỨ QUÁN')]),
        document.fonts.load('600 40px "EB Garamond VN"', 'ĐẠI SỨ QUÁN VIỆT NAM ALGÉRIE'),
        document.fonts.load('400 40px "EB Garamond VN"', 'Adresse Rue Chénoua Hydra Alger')
      ]),
      new Promise(r => setTimeout(r, 2500))
    ]);
  } catch (e) { /* bỏ qua, dùng font dự phòng */ }

  const zones = C.zones;
  const legend = $('#legend'), legendList = $('#legendList'), panel = $('#panel');
  let activeId = null, tourTimer = null, tourIdx = -1;
  const isMobile = () => matchMedia('(max-width: 760px)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  let api;
  try {
    api = mod.createScene($('#spaceCanvas'), {
      cfg: C, zones, hotspotLayer: $('#hotspots'),
      onSelect: id => handleSelect(id),
      onMode: m => handleMode(m)
    });
  } catch (err) {
    console.error(err);
    loading.textContent = 'Thiết bị này chưa hỗ trợ dựng 3D (WebGL). Hãy thử trình duyệt khác.';
    return;
  }

  function stopTour() {
    if (tourTimer) { clearInterval(tourTimer); tourTimer = null; }
    $('#tourBtn').classList.remove('on'); $('#tourBtn').textContent = 'Tham quan tự động';
  }
  function tourStep() { tourIdx = (tourIdx + 1) % zones.length; api.selectZone(zones[tourIdx].id); }
  function startTour() {
    stopTour(); legend.classList.add('closed');
    tourIdx = activeId ? zones.findIndex(z => z.id === activeId) : -1;
    tourStep(); tourTimer = setInterval(tourStep, 6500);
    $('#tourBtn').classList.add('on'); $('#tourBtn').textContent = 'Dừng tham quan';
  }

  function handleMode(m) {
    $$('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    $('#joy').hidden = !(coarse || isMobile());
    $('#spaceHint').textContent = m === 'walk'
      ? 'Kéo để nhìn quanh, dùng W A S D hoặc phím mũi tên để đi, giữ Shift để đi nhanh, bấm vào sàn để đi tới đó.'
      : 'Kéo để xoay, cuộn để phóng to, giữ chuột phải hoặc dùng phím W A S D để di chuyển, nhấp đúp vào sàn để bay tới đó.';
    if (m === 'walk') $('#spaceHint').classList.remove('gone');
  }

  function handleSelect(id) {
    activeId = id;
    if (id && id.startsWith('loc:')) { panel.hidden = true; openLoc(); return; }
    if (id === 'brochure') { panel.hidden = true; openBrochure(0); return; }
    const isFood = !!id && id.startsWith('food:');
    $$('#legendList button').forEach(b => b.classList.toggle('on', b.dataset.zone === (isFood ? 'buffet' : id)));
    if (!id) { panel.hidden = true; return; }
    if (isFood) {
      const f = C.scene.foods[Number(id.slice(5))] || {};
      const bz = zones.find(z => z.id === 'buffet');
      $('#panelNo').textContent = `Khu ${bz ? bz.no : ''}, buffet món Việt`;
      $('#panelName').textContent = f.name || 'Món ăn';
      $('#panelDesc').textContent = f.note || 'Xin mời!';
      $('#panelPlan').hidden = true;
    } else {
      const z = zones.find(x => x.id === id);
      $('#panelNo').textContent = `Khu ${z.no} trên ${zones.length}`;
      $('#panelName').textContent = z.name;
      $('#panelDesc').textContent = z.desc;
      $('#panelPlan').textContent = z.plan; $('#panelPlan').hidden = !z.plan;
    }
    panel.hidden = false; panel.scrollTop = 0;
    $('#spaceHint').classList.add('gone');
    if (isMobile()) legend.classList.add('closed');
  }

  zones.forEach(z => {
    const li = el('li');
    const b = el('button', { type: 'button', 'data-zone': z.id }, `<i>${z.no}</i><span>${esc(z.name)}</span>`);
    b.onclick = () => { stopTour(); api.selectZone(z.id); };
    li.appendChild(b); legendList.appendChild(li);
  });
  $('#legendToggle').onclick = () => {
    legend.classList.toggle('closed');
    $('#legendToggle').setAttribute('aria-expanded', String(!legend.classList.contains('closed')));
  };
  if (isMobile()) legend.classList.add('closed');
  $('#joy').hidden = !(coarse || isMobile());

  const vb = $('#viewButtons');
  VIEW_BUTTONS.forEach(([key, label], i) => {
    const b = el('button', { type: 'button' }, label);
    if (i === 0) b.classList.add('on');
    b.onclick = () => {
      stopTour(); api.selectZone(null, { fly: false }); api.setView(key);
      $$('#viewButtons button').forEach(x => x.classList.toggle('on', x === b));
    };
    vb.appendChild(b);
  });

  $$('#timeSeg button').forEach(b => b.onclick = () => {
    api.setTime(b.dataset.time);
    $$('#timeSeg button').forEach(x => x.classList.toggle('on', x === b));
  });
  $$('#modeSeg button').forEach(b => b.onclick = () => { stopTour(); api.setMode(b.dataset.mode); });
  $('#confettiBtn').onclick = () => api.confetti();
  $('#tourBtn').onclick = () => (tourTimer ? stopTour() : startTour());
  $('#panelClose').onclick = () => { stopTour(); api.selectZone(null, { fly: false }); };
  const step = d => {
    stopTour();
    const cur = activeId && activeId.startsWith('food:') ? 'buffet' : activeId;
    const i = zones.findIndex(z => z.id === cur);
    api.selectZone(zones[(i + d + zones.length) % zones.length].id);
  };
  $('#panelPrev').onclick = () => step(-1);
  $('#panelNext').onclick = () => step(1);
  $('#spaceCanvas').addEventListener('pointerdown', () => {
    stopTour();
    $$('#viewButtons button').forEach(x => x.classList.remove('on'));
  });

  /* Cần điều khiển cho điện thoại */
  const joy = $('#joy'), knob = $('#joyKnob');
  let jid = null;
  const jmove = e => {
    const r = joy.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 8, len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const mag = Math.min(1, len / max), dead = 0.14;
    const k = mag < dead ? 0 : Math.pow((mag - dead) / (1 - dead), 1.25);   // vùng chết nhỏ và tăng tốc từ từ, tránh giật
    const ang = Math.atan2(dx, -dy);
    api.setMove(Math.sin(ang) * k, Math.cos(ang) * k);
  };
  joy.addEventListener('pointerdown', e => { e.stopPropagation(); jid = e.pointerId; joy.setPointerCapture(jid); jmove(e); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === jid) jmove(e); });
  const jend = e => { if (e.pointerId !== jid) return; jid = null; knob.style.transform = ''; api.setMove(0, 0); };
  joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);

  $('#endBtn').addEventListener('click', () => { stopTour(); });

  space = { api, tourStop: stopTour };
  $('#heldChip').hidden = !held;
  loading.classList.add('gone');
  if (current === '/khong-gian') api.start();
  setTimeout(() => $('#spaceHint').classList.add('gone'), 10000);
}

/* ================= Khởi động ================= */
initText();
initHero();
window.addEventListener('hashchange', () => show(routeFromHash()));
show(routeFromHash());
