/* Great Head · landing · interacciones */
(function(){
'use strict';
gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none)').matches;
const ease = 'expo.out';

/* ─────────── 1. Logo de puntos en el hero ─────────── */
const heroHost = document.getElementById('dotgrid');
const hero = mountDotGrid(heroHost, {
  text: 'GREAT / HEAD',
  tracking: 0,
  leading: -1.4,         /* interlínea: el face tiene 9 filas y los glifos usan 7; -1.4 deja 1.6 celdas entre GREAT y HEAD, como el logo */
  cellScale: 1,
  pad: 2,
  dot: 0.5,
  outline: 0.59,
  variation: 2.4,        /* cuánto crece un punto bajo el cursor / la presión */
  reach: 170,
  amount: 1,
  speed: 1,
  bloom: 0,
  bloomMax: 3.2,         /* radio máximo relativo al hacer scroll */
  kern: true,
  fg: '#C1C1E7',
  stroke: '#E54919',
  bg: null,
  pointerHost: document.querySelector('.hero__pin')
}, window.GH_GLYPHS);

/* Fecha de apertura en puntos (sección final) */
const dateHost = document.getElementById('dotdate');
const dateGrid = mountDotGrid(dateHost, {
  text: 'NOV / 01',
  tracking: 0, leading: -1.4, cellScale: 1, pad: 1,
  dot: 0.5, outline: 0.59, variation: 2.2, reach: 140, amount: 1, speed: 1,
  bloom: 0, bloomMax: 2.6, kern: true,
  fg: '#C1C1E7', stroke: '#E54919', bg: null
}, window.GH_GLYPHS);

/* ─────────── 2. Split de texto por palabra ─────────── */
document.querySelectorAll('[data-split]').forEach(el => {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map(w => `<span class="w"><span>${w}</span></span>`).join(' ');
});

/* ─────────── 4. Nav aparece al salir del hero ─────────── */
const body = document.body;
const nav = document.getElementById('nav');
ScrollTrigger.create({
  trigger: '#hero', start: '60% top',
  onEnter: () => nav.classList.add('is-visible'),
  onLeaveBack: () => nav.classList.remove('is-visible')
});
/* fuera del hero: se esconde al bajar, vuelve al subir */
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate(self){
    if(!nav.classList.contains('is-visible')) return;
    nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > window.innerHeight * 1.5);
  }
});

if(!reduce){

/* ─────────── 5. Hero: bloom con el scroll ───────────
   Mientras el hero está pinneado, los puntos se amplían hasta fundirse,
   el canvas escala y el lockup se apaga. */
gsap.timeline({
  scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 }
})
.to({v:0}, { v: 1, duration: 1, ease: 'none', onUpdate(){ hero.setBloom(this.targets()[0].v); } }, 0)
.to('#dotgrid', { scale: 1.32, ease: 'none', duration: 1 }, 0)
.to('.hero__lockup, .hero__hint, .hero__open', { opacity: 0, y: -20, duration: .35, ease: 'none' }, 0)
.to('#dotgrid', { opacity: 0, duration: .25, ease: 'none' }, .75);

/* ─────────── 6. Manifiesto: dos líneas, palabra por palabra ─────────── */
const mLines = gsap.utils.toArray('.manifesto__line');
gsap.timeline({
  scrollTrigger: { trigger: '#manifesto', start: 'top top', end: 'bottom bottom', scrub: 0.5 }
})
.to(mLines[0].querySelectorAll('.w > span'), { y: 0, stagger: .08, duration: .6, ease: 'none' }, 0)
.to(mLines[1].querySelectorAll('.w > span'), { y: 0, stagger: .08, duration: .6, ease: 'none' }, .45)
.to(mLines[0], { opacity: .3, duration: .3, ease: 'none' }, .75);

/* ─────────── 7. Títulos y párrafos: reveal al entrar ─────────── */
gsap.utils.toArray('[data-split]:not(.manifesto__line)').forEach(el => {
  gsap.to(el.querySelectorAll('.w > span'), {
    y: 0, duration: 1.1, ease, stagger: .05,
    scrollTrigger: { trigger: el, start: 'top 85%', once: true }
  });
});
gsap.utils.toArray('[data-reveal]').forEach(el => {
  gsap.to(el, {
    opacity: 1, y: 0, duration: 1.2, ease,
    scrollTrigger: { trigger: el, start: 'top 88%', once: true }
  });
});

/* ─────────── 8. El ritual: scroll horizontal ─────────── */
const track = document.getElementById('ritualTrack');
const ritualST = gsap.to(track, {
  x: () => -(track.scrollWidth - window.innerWidth),
  ease: 'none',
  scrollTrigger: {
    trigger: '#ritual',
    start: 'top top',
    end: () => '+=' + (track.scrollWidth - window.innerWidth + window.innerHeight * .4),
    pin: '.ritual__pin',
    scrub: 0.8,
    invalidateOnRefresh: true,
    anticipatePin: 1
  }
});
/* cada foto se descubre al entrar en pantalla (dentro del track horizontal) */
gsap.utils.toArray('.step .ph').forEach(ph => {
  gsap.fromTo(ph,
    { clipPath: 'inset(0 0 0 100%)', scale: 1.08 },
    { clipPath: 'inset(0 0 0 0%)', scale: 1, duration: 1.4, ease,
      scrollTrigger: { trigger: ph, containerAnimation: ritualST, start: 'left 90%', once: true } }
  );
  const img = ph.querySelector('img');
  if(img) gsap.fromTo(img, { xPercent: -10 }, { xPercent: 10, ease: 'none',
    scrollTrigger: { trigger: ph, containerAnimation: ritualST, start: 'left right', end: 'right left', scrub: true } });
});
gsap.utils.toArray('.step__copy').forEach(c => {
  gsap.from(c.children, { y: 40, opacity: 0, stagger: .08, duration: 1, ease,
    scrollTrigger: { trigger: c, containerAnimation: ritualST, start: 'left 85%', once: true } });
});

/* ─────────── 9. "Not that": tachado con scroll ─────────── */
gsap.utils.toArray('[data-strike]').forEach(li => {
  gsap.fromTo(li, { opacity: .35 }, { opacity: 1, duration: .6, ease,
    scrollTrigger: { trigger: li, start: 'top 80%', once: true } });
  gsap.fromTo(li, { '--s': 0 }, { '--s': 1, ease: 'none',
    scrollTrigger: { trigger: li, start: 'top 70%', end: 'top 35%', scrub: true } });
});

/* ─────────── 10. Galería: parallax + descubrimiento ─────────── */
gsap.utils.toArray('.gallery__item').forEach(ph => {
  const sp = parseFloat(ph.dataset.speed || 1);
  gsap.fromTo(ph, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease,
    scrollTrigger: { trigger: ph, start: 'top 90%', once: true } });
  gsap.to(ph, { y: () => (1 - sp) * 220, ease: 'none',
    scrollTrigger: { trigger: ph, start: 'top bottom', end: 'bottom top', scrub: true } });
});

/* marquee */
const mt = document.querySelector('.marquee__track');
gsap.to(mt, { xPercent: -50, ease: 'none', duration: 28, repeat: -1 });
ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top',
  onUpdate(self){ gsap.to(mt, { timeScale: 1 + Math.abs(self.getVelocity()) / 900, duration: .4, overwrite: 'auto' }); } });

/* fecha: bloom sutil al entrar */
gsap.to({v:0}, { v: .55, ease: 'none', onUpdate(){ dateGrid.setBloom(this.targets()[0].v); },
  scrollTrigger: { trigger: '#list', start: 'top 70%', end: 'center center', scrub: true } });

} /* /reduce */

/* ─────────── 12. Cursor propio ─────────── */
if(!isTouch){
  const cur = document.querySelector('.cursor');
  const qx = gsap.quickTo(cur, 'x', { duration: .18, ease: 'power3' });
  const qy = gsap.quickTo(cur, 'y', { duration: .18, ease: 'power3' });
  window.addEventListener('pointermove', e => { qx(e.clientX); qy(e.clientY); });
  window.addEventListener('pointerdown', () => body.classList.add('is-pressing'));
  window.addEventListener('pointerup', () => body.classList.remove('is-pressing'));
  document.querySelectorAll('a, button, input').forEach(el => {
    el.addEventListener('pointerenter', () => body.classList.add('is-hovering'));
    el.addEventListener('pointerleave', () => body.classList.remove('is-hovering'));
  });
  /* ocultar cursor nativo sobre toda la página */
  document.documentElement.style.cursor = 'none';
  document.querySelectorAll('a, button, input').forEach(el => el.style.cursor = 'none');
}

/* ─────────── 13. Botones magnéticos ─────────── */
if(!isTouch && !reduce){
  document.querySelectorAll('[data-magnet]').forEach(el => {
    const xTo = gsap.quickTo(el, 'x', { duration: .5, ease }), yTo = gsap.quickTo(el, 'y', { duration: .5, ease });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * .35);
      yTo((e.clientY - (r.top + r.height / 2)) * .35);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* ─────────── 14. Anclas suaves ─────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if(id.length < 2) return;
    const t = document.querySelector(id);
    if(!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ─────────── 15. Form (sin backend todavía) ─────────── */
const form = document.querySelector('.list');
if(form){
  form.addEventListener('submit', e => {
    e.preventDefault();
    const note = form.querySelector('.list__note');
    note.textContent = 'Got it. We\'ll write once, when doors open.';
    form.querySelector('input').value = '';
  });
}

/* ─────────── 16. Color de fondo por sección ───────────
   Se crea al final: así los triggers se calculan después de los pins. */
document.querySelectorAll('[data-bg]').forEach(sec => {
  if(sec === body) return;
  ScrollTrigger.create({
    trigger: sec,
    start: 'top 55%',
    end: 'bottom 55%',
    onToggle: self => { if(self.isActive) body.dataset.bg = sec.dataset.bg; }
  });
});


window.addEventListener('load', () => ScrollTrigger.refresh());
})();
