import { ASM } from './asmdata.js';

const NS = (t, c, css) => { const e = document.createElement(t); if (c) e.className = c; if (css) e.style.cssText = css; return e; };
const ease = 'cubic-bezier(.22,.8,.24,1)';

/* Lặp lại hiệu ứng: sau khi xong chờ 7 giây rồi chạy lại, chỉ khi khối đang nằm trong màn hình */
const LOOP_GAP = 7000, LOOP_MAX = 3;   // chạy 3 lần (lần đầu và 2 lần lặp) rồi dừng ở hình hoàn chỉnh
function loopControl(box, play) {
  let visible = false, busy = false, timer = 0, runs = 0, spent = false;
  const run = () => {
    busy = true; runs++; box.style.transition = 'none'; box.style.opacity = 1; play();
  };
  const schedule = () => {
    clearTimeout(timer);
    if (runs >= LOOP_MAX) { spent = true; busy = false; return; }
    timer = setTimeout(() => {
      timer = 0;
      if (!visible) { busy = false; return; }
      box.style.transition = 'opacity .45s ease'; box.style.opacity = 0;
      timer = setTimeout(() => { timer = 0; if (visible) run(); else { busy = false; box.style.transition = 'none'; box.style.opacity = 1; } }, 480);
    }, LOOP_GAP);
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    visible = e.isIntersecting;
    if (visible && !busy && !spent) run();
  }), { threshold: .3 });
  window.addEventListener('asm-reset', () => { clearTimeout(timer); timer = 0; runs = 0; spent = false; busy = false; box.style.transition = 'none'; box.style.opacity = 1; });
  io.observe(box);
  return { done: schedule, restartNow: () => { clearTimeout(timer); timer = 0; runs = 0; spent = false; run(); } };
}


/* Dựng sân khấu từ các lớp rời, mỗi lớp về đúng toạ độ của bản thiết kế thật */
export function assemble(kind, finalSrc, onOpen) {
  const D = ASM[kind];
  const wrap = NS('div', 'asm-wrap');
  const box = NS('div', 'asm');
  box.style.aspectRatio = D.W + ' / ' + D.H;
  const stage = NS('div', 'asm-stage', `width:${D.W}px;height:${D.H}px`);
  box.appendChild(stage);

  const layers = [];                    // { el, play(delay) }
  const add = (el, wrapCss, anim) => { el.style.cssText += wrapCss || ''; stage.appendChild(el); layers.push({ el, anim }); return el; };
  const lazy = []; const img = (src, w, h) => { const i = new Image(); i.dataset.src = src; lazy.push(i); i.draggable = false; i.className = 'asm-i'; if (w) { i.width = w; i.height = h; } return i; };

  // 1. nền đỏ
  const red = NS('div', 'asm-p', `left:0;top:0;width:${D.W}px;height:${D.H}px;background:#811e18`);
  red.style.background = 'rgb(129,30,24)';
  add(red, '', { from: { opacity: 0 }, dur: 600, at: 0 });

  // 2. hoa văn lặp và chất giấy, lấy đúng từ bản thật (chừa chỗ cho các lớp phía trên)
  const pat = NS('div', 'asm-p', `left:0;top:0;width:${D.W}px;height:${D.H}px`);
  const pi = img(D.bg, D.W, D.H); pat.appendChild(pi);
  add(pat, '', { from: { opacity: 0, filter: 'blur(5px)' }, dur: 1100, at: 500 });

  // 3. hai pháo hoa
  ['fw1', 'fw2'].forEach((k, i) => {
    const e = D.ex[k], w = NS('div', 'asm-p', `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px`);
    w.appendChild(img(e.src, e.w, e.h));
    add(w, '', { from: { opacity: 0, scale: '.55' }, dur: 800, at: 1300 + i * 250, origin: '50% 50%' });
  });

  const piece = (p, anim) => {
    const w = NS('div', 'asm-p'), i = img(p.src, p.w, p.h);
    i.style.transformOrigin = '0 0';
    w.style.cssText += `transform:matrix(${p.t.join(',')})` + (p.flip ? ` translate(${p.w}px,0) scale(-1,1)` : '') + ';transform-origin:0 0';
    // chuyển động đặt trên lớp bọc ngoài để không đụng vào ma trận
    const o = NS('div', 'asm-p'); w.appendChild(i); o.appendChild(w);
    add(o, '', anim);
  };
  const by = r => D.pieces.filter(p => p.role === r);
  const left = p => p.t[4] < D.W / 2;

  // 4. góc hoa văn hai bên
  by('goc').forEach(p => piece(p, { from: { opacity: 0, translate: (left(p) ? '-90px' : '90px') + ' 0' }, dur: 900, at: 2000 }));
  // 5. cụm quạt xếp lớp (chân dê nằm dưới quạt)
  by('goat').forEach(p => piece(p, { from: { opacity: 0, translate: '0 40px' }, dur: 800, at: 2700 }));
  // 6. viền nan quạt giữa, nằm dưới hai cụm quạt
  by('vien').forEach(p => piece(p, { from: { opacity: 0, translate: '0 120px' }, dur: 900, at: 2900 }));
  by('fan').forEach(p => piece(p, { from: { opacity: 0, translate: (left(p) ? '-140px' : '140px') + ' 140px' }, dur: 1000, at: 3300 }));
  // 7. cành hoa
  by('pink').forEach((p, i) => piece(p, { from: { opacity: 0, translate: '-60px 60px' }, dur: 800, at: 4200 + i * 250 }));
  by('water').forEach((p, i) => piece(p, { from: { opacity: 0, translate: '0 60px' }, dur: 800, at: 4700 + i * 250 }));
  by('yellow').forEach((p, i) => piece(p, { from: { opacity: 0, translate: '70px 60px' }, dur: 800, at: 5000 + i * 250 }));
  // 8. hai cụm hoa mai, mỗi cụm hai bông
  ['maiL', 'maiR', 'maiM', 'pinkR'].filter(k => D.ex[k]).forEach((k, i) => {
    const e = D.ex[k], w = NS('div', 'asm-p', `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px`);
    w.appendChild(img(e.src, e.w, e.h));
    add(w, '', { from: { opacity: 0, scale: '.2' }, dur: 650, at: 5600 + i * 200, origin: '50% 50%' });
  });
  // 9. bốn đàn chim én
  ['chA', 'chB', 'chC', 'chD'].forEach((k, i) => {
    const e = D.ex[k], w = NS('div', 'asm-p', `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px`);
    w.appendChild(img(e.src, e.w, e.h));
    add(w, '', { from: { opacity: 0, translate: (i % 2 ? '120px' : '-120px') + ' -30px' }, dur: 1100, at: 6400 + i * 220 });
  });
  // 10. chữ
  const txt = (k, from, at) => {
    const e = D.ex[k], w = NS('div', 'asm-p', `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px`);
    w.appendChild(img(e.src, e.w, e.h));
    add(w, '', { from: { opacity: 0, translate: from }, dur: 1000, at });
  };
  txt('head', '0 -90px', 7500);
  txt('tet', '0 110px', 8000);
  txt('xuan', '-' + Math.round(D.W * .35) + 'px 0', 8500);
  txt('print', Math.round(D.W * .35) + 'px 0', 9000);

  // bản thật phủ lên cuối cùng để điểm ảnh khớp tuyệt đối
  const fin = new Image(); fin.dataset.src = finalSrc; lazy.push(fin); fin.className = 'asm-final'; fin.alt = '';
  fin.addEventListener('click', onOpen);
  box.appendChild(fin);
  const lio = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { lazy.forEach(i => { if (i.dataset.src) { i.src = i.dataset.src; delete i.dataset.src; } }); lio.disconnect(); } }, { rootMargin: '500px 0px' });
  lio.observe(box);

  const fit = () => { const k = box.clientWidth / D.W; stage.style.transform = `scale(${k})`; };
  new ResizeObserver(fit).observe(box); fit();

  let anims = [], endT = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settle = () => { fin.style.opacity = 1; };
  const play = () => {
    anims.forEach(a => a.cancel()); anims = []; clearTimeout(endT);
    fin.style.opacity = 0; fin.style.transition = 'none';
    if (reduce) { settle(); return; }
    let end = 0;
    layers.forEach(({ el, anim }) => {
      const kf = [Object.assign({}, anim.from), { opacity: 1, translate: '0 0', scale: '1' }];
      if (!kf[0].translate) kf[0].translate = '0 0';
      if (!kf[0].scale) kf[0].scale = '1';
      el.style.transformOrigin = anim.origin || '';
      const a = el.animate(kf, { duration: anim.dur, delay: anim.at, easing: ease, fill: 'both' });
      anims.push(a); end = Math.max(end, anim.at + anim.dur);
    });
    endT = setTimeout(() => { fin.style.transition = 'opacity .7s ease'; settle(); loop.done(); }, end + 200);
  };

  const btn = NS('button', 'asm-replay'); btn.type = 'button'; btn.textContent = 'Xem lại hiệu ứng ghép';
  btn.addEventListener('click', () => loop.restartNow());
  wrap.append(box, btn);
  const loop = loopControl(box, play);
  return wrap;
}

/* Tờ gấp ba: ban đầu gập kín, hai cánh mở ra rồi phẳng thành bản thật */
export function foldOpen(src, folds, onOpen, W = 2000, H = 1414) {
  const wrap = NS('div', 'asm-wrap');
  const box = NS('div', 'asm');
  box.style.aspectRatio = W + ' / ' + H;
  const stage = NS('div', 'asm-stage', `width:${W}px;height:${H}px;perspective:3200px;perspective-origin:50% 45%;transform-style:flat`);
  box.appendChild(stage);
  box.style.background = 'radial-gradient(ellipse at 50% 40%, #3a1214, #1b0708)';

  const widths = [0, 1, 2].map(i => folds[i + 1] - folds[i]);
  const mk = (i) => {
    const p = NS('div', 'fold-p', `position:absolute;top:0;height:${H}px;width:${widths[i]}px;transform-style:preserve-3d;`);
    const face = NS('div', 'fold-face', `position:absolute;inset:0;backface-visibility:hidden;background-position:${-folds[i]}px 0;background-size:${W}px ${H}px;background-repeat:no-repeat`);
    const back = NS('div', '', `position:absolute;inset:0;backface-visibility:hidden;transform:rotateY(180deg);background:#4a1517`);
    const shade = NS('div', 'fold-shade', `position:absolute;inset:0;backface-visibility:hidden;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.55),rgba(0,0,0,.05));opacity:0`);
    p.append(face, back, shade);
    return { p, shade };
  };
  const A = mk(0), B = mk(1), C = mk(2);
  A.p.style.left = '0';
  B.p.style.left = widths[0] + 'px'; B.p.style.transformOrigin = '0 50%';
  C.p.style.left = widths[1] + 'px'; C.p.style.transformOrigin = '0 50%';
  B.p.appendChild(C.p); A.p.appendChild(B.p);
  const holder = NS('div', '', `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-style:preserve-3d;`);
  holder.appendChild(A.p); stage.appendChild(holder);

  const fin = new Image(); fin.className = 'asm-final'; fin.alt = '';
  fin.addEventListener('click', onOpen); box.appendChild(fin);
  const lio = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { fin.src = src; box.querySelectorAll('.fold-face').forEach(f => { f.style.backgroundImage = `url(${src})`; }); lio.disconnect(); } }, { rootMargin: '500px 0px' });
  lio.observe(box);

  const fit = () => { stage.style.transform = `scale(${box.clientWidth / W})`; };
  new ResizeObserver(fit).observe(box); fit();

  let anims = [], timer = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const play = () => {
    anims.forEach(a => a.cancel()); anims = []; clearTimeout(timer);
    fin.style.transition = 'none'; fin.style.opacity = 0;
    if (reduce) { fin.style.opacity = 1; return; }
    const o = { fill: 'both' };
    const run = (el, kf, opt) => anims.push(el.animate(kf, Object.assign({}, o, opt)));
    const e1 = 'cubic-bezier(.45,.05,.2,1)';
    run(holder, [{ transform: `translateX(${(W - widths[0]) / 2}px)` }, { transform: `translateX(${(W - widths[0]) / 2}px)`, offset: .3 }, { transform: 'translateX(0)' }], { duration: 3600, easing: e1 });
    run(B.p, [{ transform: 'rotateY(178deg)' }, { transform: 'rotateY(178deg)', offset: .22 }, { transform: 'rotateY(0deg)' }], { duration: 3600, easing: e1 });
    run(C.p, [{ transform: 'rotateY(-178deg)' }, { transform: 'rotateY(-178deg)', offset: .45 }, { transform: 'rotateY(0deg)' }], { duration: 3600, easing: e1 });
    run(B.shade, [{ opacity: .9 }, { opacity: .9, offset: .22 }, { opacity: 0 }], { duration: 3600 });
    run(C.shade, [{ opacity: .9 }, { opacity: .9, offset: .45 }, { opacity: 0 }], { duration: 3600 });
    timer = setTimeout(() => { fin.style.transition = 'opacity .6s ease'; fin.style.opacity = 1; loop.done(); }, 3800);
  };
  const btn = NS('button', 'asm-replay'); btn.type = 'button'; btn.textContent = 'Xem lại hiệu ứng mở';
  btn.addEventListener('click', () => loop.restartNow());
  wrap.append(box, btn);
  const loop = loopControl(box, play);
  return wrap;
}
