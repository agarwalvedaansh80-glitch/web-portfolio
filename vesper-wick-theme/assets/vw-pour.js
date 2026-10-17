/* Vesper & Wick — "How it's poured": a canvas illustration scrubbed by scroll progress p (0..1).
   0.00–0.34 pour · 0.34–0.62 wick & centring bar · 0.62–0.94 cure (14 days) · 0.94–1 first light */
(function () {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function mixC(c1, c2, t) { return 'rgb(' + c1.map(function (v, i) { return Math.round(mix(v, c2[i], t)); }).join(',') + ')'; }

  function PourScene(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.p = 0; this.t = 0; this.resize();
  }
  PourScene.prototype.resize = function () {
    var r = this.c.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    this.c.width = Math.round(r.width * d); this.c.height = Math.round(r.height * d); this.d = d; this.W = r.width; this.H = r.height;
  };
  PourScene.prototype.draw = function (p, t) {
    var g = this.g, W = this.W, H = this.H; this.p = p; this.t = t || 0;
    g.setTransform(this.d, 0, 0, this.d, 0, 0); g.clearRect(0, 0, W, H);
    var jw = Math.min(W * .56, H * .46), jh = jw * 1.04, cx = W * .5, bot = H * .9, top = bot - jh, ry = jw * .13, rx = jw / 2;
    var sPour = seg(p, .02, .32), sWick = seg(p, .36, .58), sCure = seg(p, .64, .92), sLight = seg(p, .94, 1);
    var level = mix(bot - ry * .3, top + jh * .2, ease(sPour));
    var setAmt = clamp(sWick * .45 + sCure * .55, 0, 1);
    var flick = .9 + .1 * Math.sin(this.t * 13) * Math.sin(this.t * 7.3 + 1);

    // back glow + cure ring
    var gl = g.createRadialGradient(cx, top + jh * .3, 0, cx, top + jh * .3, jw * 1.25);
    gl.addColorStop(0, 'rgba(224,103,44,' + (.10 + .28 * sLight * flick) + ')'); gl.addColorStop(1, 'rgba(224,103,44,0)');
    g.fillStyle = gl; g.fillRect(0, 0, W, H);
    if (sCure > 0 || p > .6) {
      var R = jw * .86, ccx = cx, ccy = top + jh * .45, a0 = -Math.PI / 2, ringA = clamp(seg(p, .6, .66), 0, 1) * (1 - sLight * .7);
      for (var i = 0; i < 14; i++) {
        var a = a0 + i / 14 * Math.PI * 2, on = sCure * 14 > i + .5;
        g.strokeStyle = on ? 'rgba(240,138,75,' + (.85 * ringA) + ')' : 'rgba(236,228,214,' + (.14 * ringA) + ')';
        g.lineWidth = on ? 2 : 1;
        g.beginPath(); g.moveTo(ccx + Math.cos(a) * R, ccy + Math.sin(a) * R); g.lineTo(ccx + Math.cos(a) * (R + (on ? 16 : 10)), ccy + Math.sin(a) * (R + (on ? 16 : 10))); g.stroke();
      }
      g.strokeStyle = 'rgba(236,228,214,' + (.08 * ringA) + ')'; g.lineWidth = 1; g.beginPath(); g.arc(ccx, ccy, R - 8, 0, Math.PI * 2); g.stroke();
    }

    // back of glass
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(236,228,214,.18)';
    g.beginPath(); g.ellipse(cx, top, rx, ry, 0, Math.PI, Math.PI * 2); g.stroke();
    var inner = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
    inner.addColorStop(0, 'rgba(236,228,214,.05)'); inner.addColorStop(.5, 'rgba(236,228,214,.015)'); inner.addColorStop(1, 'rgba(236,228,214,.06)');
    g.fillStyle = inner; g.beginPath(); g.moveTo(cx - rx, top); g.lineTo(cx - rx, bot); g.ellipse(cx, bot, rx, ry, 0, Math.PI, 0, true); g.lineTo(cx + rx, top); g.ellipse(cx, top, rx, ry, 0, 0, Math.PI, true); g.fill();

    // wick
    var tabY = bot - ry * .3 - 2, wickTop = top + jh * .2 - jh * .13, lean = (1 - ease(sWick)) * jw * .12;
    var wtopY = sPour > 0 ? wickTop : wickTop;
    g.fillStyle = 'rgba(160,150,140,.8)'; g.beginPath(); g.ellipse(cx, tabY, 9, 3, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = sLight > 0 ? '#1a1410' : '#efe4d0'; g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, tabY); g.quadraticCurveTo(cx + lean * .2, mix(tabY, wtopY, .6), cx + lean, wtopY); g.stroke();
    // wax body
    var molten = [233, 178, 108], setC = [238, 228, 212];
    var wi = rx - 5;
    if (sPour > 0) {
      var wg = g.createLinearGradient(cx - wi, 0, cx + wi, 0);
      wg.addColorStop(0, mixC([178, 120, 62], [196, 186, 170], setAmt)); wg.addColorStop(.35, mixC(molten, setC, setAmt)); wg.addColorStop(.7, mixC([246, 206, 150], [246, 240, 230], setAmt)); wg.addColorStop(1, mixC([170, 112, 58], [190, 180, 164], setAmt));
      g.fillStyle = wg; g.beginPath(); g.moveTo(cx - wi, level); g.lineTo(cx - wi, bot - 4); g.ellipse(cx, bot - 4, wi, ry - 3, 0, Math.PI, 0, true); g.lineTo(cx + wi, level); g.closePath(); g.fill();
      // surface
      var sg = g.createRadialGradient(cx - wi * .25, level - ry * .3, 2, cx, level, wi);
      sg.addColorStop(0, mixC([255, 226, 180], [250, 245, 236], setAmt)); sg.addColorStop(1, mixC([214, 150, 84], [222, 212, 196], setAmt));
      g.fillStyle = sg; g.beginPath(); g.ellipse(cx, level, wi, ry - 3, 0, 0, Math.PI * 2); g.fill();
      // gloss while molten
      g.globalAlpha = (1 - setAmt) * .55; g.fillStyle = '#fff3df'; g.beginPath(); g.ellipse(cx - wi * .35, level - ry * .25, wi * .28, ry * .16, -.1, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      // cured frost speckle
      if (sCure > 0) {
        g.fillStyle = 'rgba(255,255,255,' + (.35 * sCure) + ')';
        for (var k = 0; k < 70; k++) { var ang = k * 2.39996, rr = Math.sqrt((k + .5) / 70); g.fillRect(cx + Math.cos(ang) * rr * wi * .92, level + Math.sin(ang) * rr * (ry - 5), 1.2, 1.2); }
      }
      // ripples from the stream
      if (sPour > 0 && sPour < 1) {
        for (var q = 0; q < 3; q++) {
          var ph = ((this.t * .9 + q / 3) % 1), ix = cx + wi * .12;
          g.strokeStyle = 'rgba(255,236,206,' + (.5 * (1 - ph) * (1 - sPour * .5)) + ')'; g.lineWidth = 1;
          g.beginPath(); g.ellipse(ix, level, 6 + ph * wi * .55, (6 + ph * wi * .55) * (ry / rx), 0, 0, Math.PI * 2); g.stroke();
        }
      }
    }

    // pitcher + stream
    var pin = seg(p, 0, .06), pout = seg(p, .3, .36), pv = pin * (1 - pout);
    if (pv > 0) {
      var px = cx + jw * .62 + (1 - pv) * jw * .5, py = top - jh * .42 - (1 - pv) * 40, tilt = mix(-.15, -.62, ease(pin)) + pout * .4;
      var flow = clamp(sPour * 6, 0, 1) * (1 - seg(p, .27, .32));
      var sx = px - jw * .3 * Math.cos(tilt) , sy = py + jw * .3 * Math.sin(-tilt) * -1;
      // spout position in rotated frame
      g.save(); g.translate(px, py); g.rotate(tilt);
      var pw = jw * .5, ph2 = jw * .56;
      var pg = g.createLinearGradient(-pw / 2, 0, pw / 2, 0); pg.addColorStop(0, '#2c2520'); pg.addColorStop(.45, '#5c5148'); pg.addColorStop(.6, '#8a7d70'); pg.addColorStop(1, '#2a231e');
      g.fillStyle = pg; g.beginPath();
      g.moveTo(-pw / 2, -ph2 / 2); g.lineTo(-pw / 2 - pw * .22, -ph2 / 2 - pw * .08); g.lineTo(-pw / 2 - pw * .1, -ph2 / 2 + pw * .1);
      g.lineTo(-pw / 2, -ph2 / 2 + pw * .14); g.lineTo(-pw * .46, ph2 / 2); g.quadraticCurveTo(0, ph2 / 2 + 8, pw * .46, ph2 / 2); g.lineTo(pw / 2, -ph2 / 2); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(236,228,214,.35)'; g.lineWidth = 1; g.stroke();
      g.strokeStyle = 'rgba(236,228,214,.25)'; g.beginPath(); g.moveTo(pw / 2, -ph2 * .3); g.bezierCurveTo(pw * .95, -ph2 * .3, pw * .95, ph2 * .25, pw * .46, ph2 * .25); g.lineWidth = 6; g.stroke();
      var spx = -pw / 2 - pw * .2, spy = -ph2 / 2 - pw * .05;
      g.restore();
      var c0 = Math.cos(tilt), s0 = Math.sin(tilt);
      var ox = px + spx * c0 - spy * s0, oy = py + spx * s0 + spy * c0;
      if (flow > 0.01) {
        var ex = cx + wi * .12, ey = level, wob = Math.sin(this.t * 9) * 1.5;
        var w0 = 7 * flow, w1 = 4 * flow;
        var st = g.createLinearGradient(0, oy, 0, ey); st.addColorStop(0, '#f7cf97'); st.addColorStop(1, '#e9a65c');
        g.fillStyle = st; g.beginPath();
        g.moveTo(ox - w0 / 2, oy); g.bezierCurveTo(ox - 10, oy + 30, ex - w1 + wob, ey - (ey - oy) * .5, ex - w1 / 2 + wob, ey);
        g.lineTo(ex + w1 / 2 + wob, ey); g.bezierCurveTo(ex + w1 + wob, ey - (ey - oy) * .5, ox - 4, oy + 30, ox + w0 / 2, oy); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,245,225,.55)'; g.fillRect(ex - 1 + wob, oy + (ey - oy) * .45, 1.2, (ey - oy) * .5);
      }
    }

    // centring bar
    var bIn = seg(p, .4, .5), bOut = seg(p, .9, .95), bv = bIn * (1 - bOut);
    if (bv > 0) {
      var bw = jw * 1.24, bh = 12, bx = cx - bw / 2 - (1 - ease(bIn)) * W * .8 + ease(bOut) * W * .8, by = top - 4;
      var bg = g.createLinearGradient(0, by - bh / 2, 0, by + bh / 2); bg.addColorStop(0, '#c49a6a'); bg.addColorStop(1, '#8c6a46');
      g.fillStyle = bg; roundRect(g, bx, by - bh / 2, bw, bh, 3); g.fill();
      g.strokeStyle = 'rgba(60,40,20,.35)'; g.lineWidth = 1;
      for (var j = 0; j < 5; j++) { g.beginPath(); g.moveTo(bx + 12 + j * bw / 5, by - 2 + (j % 2)); g.lineTo(bx + 40 + j * bw / 5, by - 1 + (j % 2)); g.stroke(); }
      g.fillStyle = '#2a201a'; g.fillRect(cx - 3 + lean * 0, by - bh / 2 + 3, 6, bh - 6);
      // centre guide
      g.setLineDash([3, 5]); g.strokeStyle = 'rgba(240,138,75,' + (.7 * bv * (1 - sCure)) + ')'; g.beginPath(); g.moveTo(cx, top - jh * .32); g.lineTo(cx, bot + 10); g.stroke(); g.setLineDash([]);
      if (sCure < 1) { g.fillStyle = 'rgba(240,138,75,' + (.9 * bv * (1 - sCure)) + ')'; g.font = '500 11px "Hanken Grotesk",sans-serif'; g.textAlign = 'left'; g.fillText('± 0.5 MM', cx + 10, top - jh * .26); }
    }

    // front glass
    var fg = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
    fg.addColorStop(0, 'rgba(236,228,214,.55)'); fg.addColorStop(.08, 'rgba(236,228,214,.12)'); fg.addColorStop(.5, 'rgba(236,228,214,.03)'); fg.addColorStop(.92, 'rgba(236,228,214,.14)'); fg.addColorStop(1, 'rgba(236,228,214,.5)');
    g.fillStyle = fg; g.beginPath(); g.moveTo(cx - rx, top); g.lineTo(cx - rx, bot); g.ellipse(cx, bot, rx, ry, 0, Math.PI, 0, true); g.lineTo(cx + rx, top); g.ellipse(cx, top, rx, ry, 0, 0, Math.PI, false); g.fill();
    g.strokeStyle = 'rgba(236,228,214,.55)'; g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(cx, top, rx, ry, 0, 0, Math.PI); g.stroke();
    g.beginPath(); g.moveTo(cx - rx, top); g.lineTo(cx - rx, bot); g.stroke(); g.beginPath(); g.moveTo(cx + rx, top); g.lineTo(cx + rx, bot); g.stroke();
    g.beginPath(); g.ellipse(cx, bot, rx, ry, 0, 0, Math.PI); g.stroke();
    g.strokeStyle = 'rgba(236,228,214,.22)'; g.beginPath(); g.ellipse(cx, bot - 10, rx - 4, ry - 2, 0, 0, Math.PI); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.14)'; roundRect(g, cx - rx + jw * .08, top + jh * .12, jw * .045, jh * .7, 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.06)'; roundRect(g, cx + rx - jw * .1, top + jh * .2, jw * .02, jh * .5, 6); g.fill();

    // scent particles (deterministic in p, so scrubbing back and forth is stable)
    var sp = sCure * (1 - sLight * .4);
    if (sp > 0) {
      for (var n = 0; n < 26; n++) {
        var ph3 = ((p * 6 + n * .1371 + this.t * .04) % 1), xx = cx + Math.sin(n * 12.9 + ph3 * 5) * jw * (.15 + .25 * ph3), yy = level - 10 - ph3 * H * .45;
        g.fillStyle = 'rgba(243,210,181,' + (Math.sin(ph3 * Math.PI) * .6 * sp) + ')';
        g.beginPath(); g.arc(xx, yy, 1.2 + (n % 3) * .6, 0, Math.PI * 2); g.fill();
      }
    }

    // first light
    if (sLight > 0) {
      var fx = cx + lean, fy = wtopY - 2, fh = 34 * ease(sLight) * flick, fw = fh * .22;
      var fl = g.createRadialGradient(fx, fy - fh * .4, 0, fx, fy - fh * .4, fh * 3.4);
      fl.addColorStop(0, 'rgba(255,170,90,' + (.45 * sLight) + ')'); fl.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = fl; g.fillRect(fx - fh * 4, fy - fh * 4, fh * 8, fh * 8);
      var ff = g.createLinearGradient(0, fy, 0, fy - fh); ff.addColorStop(0, 'rgba(90,120,255,.8)'); ff.addColorStop(.18, '#ffd9a0'); ff.addColorStop(.6, '#ff9a45'); ff.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = ff; g.beginPath(); g.moveTo(fx, fy - fh); g.bezierCurveTo(fx + fw * 1.3, fy - fh * .45, fx + fw, fy, fx, fy + 2); g.bezierCurveTo(fx - fw, fy, fx - fw * 1.3, fy - fh * .45, fx, fy - fh); g.fill();
      g.fillStyle = 'rgba(255,250,235,.9)'; g.beginPath(); g.ellipse(fx, fy - fh * .32, fw * .35, fh * .22, 0, 0, Math.PI * 2); g.fill();
    }
  };
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  window.PourScene = PourScene;
})();
