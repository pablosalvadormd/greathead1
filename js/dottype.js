/* Great Head · motor de tipografía de puntos
   Adaptado del engine de Dot Type Studio (face "Logotype · chain").
   Cambios respecto al original:
   - bg transparente (la sección pinta el fondo)
   - CFG.bloom (0..1): ampliación global de los puntos, la maneja el scroll
   - press: se activa en cualquier pointerdown sobre el contenedor
   - expone setBloom / setPointer para que GSAP lo controle
*/
function mountDotGrid(el, CFG, G){
  var cv = document.createElement('canvas');
  cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  el.appendChild(cv);
  var ctx = cv.getContext('2d');
  var dots = [], W = 0, H = 0, cellPx = 10, cols = 0, rows = 0, raf = 0, frozen = false;
  var ptr = {x:-1e5, y:-1e5, on:false, held:false};
  var press = {x:0, y:0, v:0};
  var last = 0;

  function set(k){ return G[k] || G['FALLBACK']; }
  function spec(ch){
    var v = set(ch);
    return (v && typeof v[0] === 'string') ? {w:v[0].length, m:v} : v;
  }
  function glyphPts(ch){
    var sp = spec(ch), d = 1, pts = [], i, k;
    function push(x,y){
      for(var z=0;z<pts.length;z++){
        var ax = pts[z][0]-x, ay = pts[z][1]-y;
        if(ax*ax+ay*ay < 0.25) return;
      }
      pts.push([x,y]);
    }
    var P = sp.p || [];
    for(k=0;k<P.length;k++){
      var poly = P[k];
      for(var j=0;j<poly.length-1;j++){
        var a = poly[j], b = poly[j+1];
        var dx = (b[0]-a[0])*d, dy = (b[1]-a[1])*d, len = Math.sqrt(dx*dx+dy*dy);
        var n = Math.max(1, Math.round(len));
        for(i=0;i<=n;i++) push(a[0]*d+dx*i/n, a[1]*d+dy*i/n);
      }
    }
    var D = sp.d || [];
    for(k=0;k<D.length;k++) push(D[k][0]*d, D[k][1]*d);
    return {pts:pts, w:sp.w, h:(G.__rows||7), bitmap:false};
  }
  function words(){
    return String(CFG.text).toUpperCase().split(/[\n\/]/)
      .map(function(s){ return s.trim(); }).filter(function(s){ return s.length; });
  }
  function block(word){
    var cut = CFG.tracking < 0 ? -CFG.tracking : 0;
    var gap = CFG.tracking > 0 ? CFG.tracking : 0;
    var kern = (CFG.kern === false) ? null : (G.__kern || null);
    var pts = [], x = 0, h = 1, i, j;
    for(i=0;i<word.length;i++){
      if(kern && i > 0){
        var kk = kern[word.charAt(i-1) + word.charAt(i)];
        if(kk) x += kk;
      }
      var g = glyphPts(word.charAt(i)), lastC = (i === word.length-1);
      var keep = lastC ? g.w : Math.max(1, g.w-cut);
      var lim = lastC ? 1e9 : keep;
      if(g.h > h) h = g.h;
      for(j=0;j<g.pts.length;j++){
        var q = g.pts[j];
        if(q[0] > lim + 0.001) continue;
        pts.push([x+q[0], q[1], i]);
      }
      x += keep + (lastC ? 0 : gap);
    }
    return {pts:pts, w:x, h:h};
  }
  function build(){
    var lines = words().map(block), lead = CFG.leading;
    cols = 1; rows = 0;
    lines.forEach(function(b){ if(b.w > cols) cols = b.w; });
    lines.forEach(function(b, i){ rows += b.h + (i ? lead : 0); });
    var pad = CFG.pad == null ? 2 : CFG.pad;
    var fit = Math.min(W/(cols+pad), H/(rows+pad));
    cellPx = Math.max(0.8, fit*CFG.cellScale);
    var cur = 0;
    var ox = (W-(cols-1)*cellPx)/2, oy = (H-(rows-1)*cellPx)/2;
    dots = [];
    lines.forEach(function(b, li){
      var off = (cols-b.w)/2;
      b.pts.forEach(function(q){
        var gx = off+q[0], gy = cur+q[1];
        dots.push({x:ox+gx*cellPx, y:oy+gy*cellPx,
                   gx:gx, gy:gy, ci:q[2], li:li, r:0, v:0, seed:Math.random()*6.283});
      });
      cur += b.h + lead;
    });
  }
  function resize(){
    W = el.clientWidth; H = el.clientHeight;
    if(!W || !H) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    build();
  }
  function target(d, now){
    var base = CFG.dot*cellPx, va = CFG.variation, t = base;
    /* hover: los puntos cerca del cursor crecen */
    if(CFG.reach > 0 && ptr.on){
      var di = Math.sqrt((d.x-ptr.x)*(d.x-ptr.x)+(d.y-ptr.y)*(d.y-ptr.y));
      if(di < CFG.reach){ var k = 1-di/CFG.reach; t += base*(va-1)*k*k; }
    }
    /* press: punto de presión que se expande mientras se mantiene */
    if(press.v > 0.001){
      var pr = Math.sqrt((d.x-press.x)*(d.x-press.x)+(d.y-press.y)*(d.y-press.y));
      var rad = cellPx*7 + cellPx*16*press.v;
      if(pr < rad){ var kp = 1-pr/rad; t += base*(va-1)*CFG.amount*1.6*press.v*kp*kp; }
    }
    /* bloom: ampliación global, la maneja el scroll. Parte del centro hacia afuera */
    var bl = CFG.bloom || 0;
    if(bl > 0){
      var cx = W/2, cy = H/2;
      var dc = Math.sqrt((d.x-cx)*(d.x-cx)+(d.y-cy)*(d.y-cy)) / Math.sqrt(cx*cx+cy*cy);
      var w = Math.max(0, Math.min(1, (bl*1.35 - dc*0.35)));
      t += base*(CFG.bloomMax-1)*w*w;
    }
    return t;
  }
  function shape(g, x, y, r){ g.moveTo(x+r, y); g.arc(x, y, r, 0, Math.PI*2); }
  function trace(g, sc){
    g.beginPath();
    for(var j=0;j<dots.length;j++){
      var d = dots[j], r = Math.max(0.15, d.r)*sc;
      shape(g, d.x*sc, d.y*sc, r);
    }
  }
  function render(g, sc){
    g.clearRect(0,0,W*sc,H*sc);
    if(CFG.bg){ g.fillStyle = CFG.bg; g.fillRect(0,0,W*sc,H*sc); }
    var ol = CFG.outline || 0;
    if(ol > 0){
      trace(g, sc);
      g.strokeStyle = CFG.stroke || '#000000';
      g.lineWidth = ol*cellPx*sc;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.stroke();
    }
    trace(g, sc);
    g.fillStyle = CFG.fg;
    g.fill('nonzero');
  }
  function frame(now){
    var dt = last ? Math.min(64, now-last) : 16; last = now;
    if(!frozen){
      if(ptr.held){ press.x = ptr.x; press.y = ptr.y; press.v = Math.min(1, press.v + dt/620*CFG.speed); }
      else press.v = Math.max(0, press.v - dt/1150*CFG.speed);
      for(var j=0;j<dots.length;j++){
        var d = dots[j], t = target(d, now);
        d.v = (d.v + (t-d.r)*0.24)*0.7; d.r += d.v;
      }
    }
    render(ctx, 1);
    raf = requestAnimationFrame(frame);
  }
  function pos(e){ var b = cv.getBoundingClientRect(); ptr.x = e.clientX-b.left; ptr.y = e.clientY-b.top; ptr.on = true; }
  function up(){ ptr.held = false; }
  var host = CFG.pointerHost || el;
  host.addEventListener('pointermove', pos);
  host.addEventListener('pointerleave', function(){ ptr.on = false; ptr.x = ptr.y = -1e5; });
  host.addEventListener('pointerdown', function(e){ pos(e); ptr.held = true; });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  var ro = new ResizeObserver(resize); ro.observe(el);
  resize(); raf = requestAnimationFrame(frame);

  return {
    destroy: function(){ cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointerup', up); if(cv.parentNode) cv.parentNode.removeChild(cv); },
    update: function(next){ for(var k in next) CFG[k] = next[k]; build(); },
    setBloom: function(v){ CFG.bloom = v; },
    pressAt: function(x, y, on){ ptr.x = x; ptr.y = y; ptr.on = true; ptr.held = !!on; },
    freeze: function(v){ frozen = v; },
    pressValue: function(){ return press.v; },
    dots: function(){ return dots; },
    size: function(){ return {w:W, h:H}; },
    grid: function(){ return {cols:cols, rows:rows, cell:cellPx}; },
    config: CFG
  };
}
window.mountDotGrid = mountDotGrid;
