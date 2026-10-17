/* Specials Board: procedural café "photos" drawn on canvas.
   Every post is generated from a seed, so the feed looks hand-made but costs no image downloads. */
(function (w) {
  'use strict';
  var C = {
    esp: '#2B1B13', esp2: '#4A2E1F', crema: '#C8874E', crema2: '#A7653A', milk: '#F6EBDA',
    oat: '#EFE5D3', oat2: '#E2D2B6', board: '#1E3A2F', board2: '#2A4C3F', chalk: '#F4EFE3',
    tom: '#D94A2B', tom2: '#B5341C', leaf: '#5E7F4E', wood: '#9C6B43', wood2: '#7D5233', sugar: '#FFF6E6'
  };
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function circle(x, y, r, fill) { this.beginPath(); this.arc(x, y, r, 0, Math.PI * 2); this.fillStyle = fill; this.fill(); }
  function grain(ctx, s, r, amt, light) {
    var n = Math.round(s * s / 90);
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = (light && r() > 0.5) ? 'rgba(255,248,235,' + (amt * r()) + ')' : 'rgba(20,10,5,' + (amt * r()) + ')';
      ctx.fillRect(r() * s, r() * s, 1 + r() * 1.5, 1 + r() * 1.5);
    }
  }
  function vignette(ctx, s, a) {
    var g = ctx.createRadialGradient(s / 2, s / 2, s * 0.25, s / 2, s / 2, s * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,8,2,' + a + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  }
  function wood(ctx, s, r, base, dark) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, s, s);
    var planks = 3 + Math.floor(r() * 2), ph = s / planks;
    for (var p = 0; p < planks; p++) {
      ctx.fillStyle = 'rgba(0,0,0,' + (0.04 + r() * 0.08) + ')'; ctx.fillRect(0, p * ph, s, ph);
      ctx.strokeStyle = dark; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
      for (var k = 0; k < 7; k++) {
        ctx.beginPath(); var yy = p * ph + r() * ph; ctx.moveTo(0, yy);
        for (var x = 0; x <= s; x += s / 8) ctx.lineTo(x, yy + Math.sin(x / s * 6 + k) * 2 + (r() - 0.5) * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(20,8,2,.35)'; ctx.fillRect(0, (p + 1) * ph - 1.5, s, 1.5);
    }
  }
  function shadow(ctx, x, y, rx, ry, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(20,8,2,' + a + ')'); g.addColorStop(1, 'rgba(20,8,2,0)');
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function rosetta(ctx, cx, cy, R, r, tulip) {
    ctx.fillStyle = C.milk;
    if (tulip) {
      for (var i = 0; i < 3; i++) {
        var yy = cy + R * 0.42 - i * R * 0.36, rr = R * (0.36 - i * 0.07);
        ctx.beginPath(); ctx.ellipse(cx, yy, rr * 1.1, rr * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.crema; ctx.beginPath(); ctx.ellipse(cx, yy + rr * 0.42, rr * 0.8, rr * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.milk;
      }
    } else {
      for (var j = 0; j < 7; j++) {
        var t = j / 6, y2 = cy + R * 0.55 - t * R * 1.05, half = R * (0.62 - t * 0.42);
        ctx.beginPath(); ctx.moveTo(cx - half, y2);
        ctx.quadraticCurveTo(cx, y2 - half * 0.9, cx + half, y2);
        ctx.quadraticCurveTo(cx, y2 - half * 0.35, cx - half, y2); ctx.fill();
      }
    }
    ctx.strokeStyle = C.milk; ctx.lineWidth = R * 0.05; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy + R * 0.7); ctx.lineTo(cx, cy - R * 0.62); ctx.stroke();
  }
  function cupTop(ctx, s, r, tulip) {
    var cx = s * (0.48 + (r() - 0.5) * 0.08), cy = s * (0.52 + (r() - 0.5) * 0.06);
    shadow(ctx, cx + s * 0.04, cy + s * 0.06, s * 0.42, s * 0.38, 0.45);
    circle.call(ctx, cx, cy, s * 0.4, '#F3EFE8');
    circle.call(ctx, cx, cy, s * 0.37, '#E6E0D6');
    // handle
    ctx.fillStyle = '#ECE6DC'; ctx.beginPath(); ctx.ellipse(cx + s * 0.36, cy + s * 0.2, s * 0.06, s * 0.035, 0.6, 0, Math.PI * 2); ctx.fill();
    circle.call(ctx, cx, cy, s * 0.26, '#FBF8F3');
    var g = ctx.createRadialGradient(cx - s * 0.05, cy - s * 0.05, s * 0.02, cx, cy, s * 0.22);
    g.addColorStop(0, '#D49A62'); g.addColorStop(0.75, C.crema2); g.addColorStop(1, '#6E3F1E');
    circle.call(ctx, cx, cy, s * 0.22, g);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate((r() - 0.5) * 0.9); rosetta(ctx, 0, 0, s * 0.2, r, tulip); ctx.restore();
    // spoon
    ctx.fillStyle = '#C9C3B8'; ctx.save(); ctx.translate(cx - s * 0.3, cy + s * 0.27); ctx.rotate(-0.7);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.045, s * 0.03, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(s * 0.03, -s * 0.008, s * 0.16, s * 0.016); ctx.restore();
  }
  function bun(ctx, x, y, R, r) {
    shadow(ctx, x + R * 0.15, y + R * 0.25, R * 1.25, R * 0.9, 0.4);
    var g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R);
    g.addColorStop(0, '#E4A867'); g.addColorStop(0.7, '#B8733A'); g.addColorStop(1, '#7E4520');
    ctx.fillStyle = g; ctx.beginPath();
    for (var a = 0; a <= Math.PI * 2 + 0.01; a += 0.2) { var rr = R * (0.92 + Math.sin(a * 5 + r() * 0.3) * 0.07); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,36,12,.55)'; ctx.lineWidth = R * 0.09; ctx.lineCap = 'round'; ctx.beginPath();
    var rot = r() * 6;
    for (var t = 0; t < 14; t += 0.15) { var rad = R * 0.07 * t * 0.85; ctx.lineTo(x + Math.cos(t + rot) * rad, y + Math.sin(t + rot) * rad); }
    ctx.stroke();
    ctx.fillStyle = C.sugar;
    for (var k = 0; k < 26; k++) { var aa = r() * 6.28, d = r() * R * 0.85; ctx.fillRect(x + Math.cos(aa) * d, y + Math.sin(aa) * d, 1.6, 1.6); }
  }
  function chalkText(ctx, txt, x, y, size, color, r, align) {
    ctx.font = '700 ' + size + 'px "Caveat Variable", "Caveat", cursive';
    ctx.textAlign = align || 'left'; ctx.fillStyle = color;
    ctx.globalAlpha = 0.95; ctx.fillText(txt, x, y);
    ctx.globalAlpha = 0.25; ctx.fillText(txt, x + 0.8, y + 0.6); ctx.globalAlpha = 1;
  }
  var draw = {
    latte: function (ctx, s, r) { wood(ctx, s, r, C.wood, C.wood2); cupTop(ctx, s, r, false); },
    tulip: function (ctx, s, r) { ctx.fillStyle = '#D9CBB3'; ctx.fillRect(0, 0, s, s); grain(ctx, s, r, 0.12, true);
      ctx.fillStyle = '#C4B293'; for (var i = 0; i < 6; i++) ctx.fillRect(0, i * s / 6, s, 1); cupTop(ctx, s, r, true); },
    buns: function (ctx, s, r) {
      ctx.fillStyle = '#3A2A22'; ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#5B4337'; ctx.fillRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
      ctx.fillStyle = '#EDE1CC'; ctx.fillRect(s * 0.09, s * 0.09, s * 0.82, s * 0.82);
      var R = s * 0.13;
      for (var row = 0; row < 3; row++) for (var col = 0; col < 3; col++) {
        if (row === 2 && col === 2 && r() > 0.3) continue;
        bun(ctx, s * (0.25 + col * 0.25) + (r() - 0.5) * 6, s * (0.25 + row * 0.25) + (r() - 0.5) * 6, R, r);
      }
    },
    board: function (ctx, s, r, n) {
      ctx.fillStyle = C.wood2; ctx.fillRect(0, 0, s, s); grain(ctx, s, r, 0.2);
      ctx.fillStyle = C.board; ctx.fillRect(s * 0.08, s * 0.08, s * 0.84, s * 0.84);
      for (var i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(244,239,227,' + (0.03 + r() * 0.05) + ')'; ctx.beginPath(); ctx.ellipse(s * r(), s * r(), s * 0.2 * r() + 10, s * 0.08, r() * 3, 0, 6.28); ctx.fill(); }
      var sets = [['Today', 'Cardamom bun  $4', 'Oat flat white  $4.5', 'Out at 8, gone by 10'], ['Specials', 'Tomato focaccia  $6', 'Iced long black  $5', 'Ask about the bake'], ['Saturday', 'Buns out at 7:30', 'Two trays only', 'Come early']];
      var t = sets[n % sets.length];
      chalkText(ctx, t[0], s * 0.5, s * 0.27, s * 0.16, C.chalk, r, 'center');
      ctx.strokeStyle = C.tom; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s * 0.3, s * 0.32); ctx.quadraticCurveTo(s * 0.5, s * 0.3, s * 0.7, s * 0.33); ctx.stroke();
      chalkText(ctx, t[1], s * 0.16, s * 0.47, s * 0.095, C.chalk, r);
      chalkText(ctx, t[2], s * 0.16, s * 0.6, s * 0.095, C.chalk, r);
      chalkText(ctx, t[3], s * 0.5, s * 0.8, s * 0.09, '#F2C46B', r, 'center');
      grain(ctx, s, r, 0.15, true);
    },
    croissant: function (ctx, s, r) {
      ctx.fillStyle = '#7C8E7A'; ctx.fillRect(0, 0, s, s); grain(ctx, s, r, 0.12, true);
      shadow(ctx, s * 0.52, s * 0.58, s * 0.42, s * 0.36, 0.4);
      circle.call(ctx, s * 0.5, s * 0.52, s * 0.4, '#F4EFE6'); circle.call(ctx, s * 0.5, s * 0.52, s * 0.33, '#EAE2D5');
      ctx.save(); ctx.translate(s * 0.5, s * 0.53); ctx.rotate(-0.35 + r() * 0.3);
      for (var i = -3; i <= 3; i++) {
        var x = i * s * 0.07, h = s * (0.2 - Math.abs(i) * 0.035), wv = s * 0.075;
        var g = ctx.createLinearGradient(x, -h, x, h); g.addColorStop(0, '#E9AE62'); g.addColorStop(0.5, '#C47A35'); g.addColorStop(1, '#8B4A1D');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, Math.abs(i) * s * 0.025, wv, h, i * 0.12, 0, 6.28); ctx.fill();
        ctx.strokeStyle = 'rgba(90,40,10,.35)'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();
    },
    iced: function (ctx, s, r) {
      ctx.fillStyle = C.tom; ctx.fillRect(0, 0, s, s); grain(ctx, s, r, 0.12, true);
      ctx.fillStyle = 'rgba(80,20,8,.25)'; ctx.fillRect(0, s * 0.78, s, s * 0.22);
      var x0 = s * 0.33, x1 = s * 0.67, top = s * 0.18, bot = s * 0.84;
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x1, top); ctx.lineTo(x1 - s * 0.03, bot); ctx.lineTo(x0 + s * 0.03, bot); ctx.fill();
      var g = ctx.createLinearGradient(0, s * 0.35, 0, bot); g.addColorStop(0, '#E9D6BC'); g.addColorStop(0.45, '#B57843'); g.addColorStop(1, '#5A2F14');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 + s * 0.012, s * 0.34); ctx.lineTo(x1 - s * 0.012, s * 0.34); ctx.lineTo(x1 - s * 0.03, bot - 3); ctx.lineTo(x0 + s * 0.03, bot - 3); ctx.fill();
      for (var i = 0; i < 4; i++) { ctx.save(); ctx.translate(s * (0.42 + r() * 0.16), s * (0.3 + i * 0.1)); ctx.rotate(r() * 1.4); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-s * 0.05, -s * 0.05, s * 0.1, s * 0.1); ctx.restore(); }
      ctx.strokeStyle = C.oat; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(s * 0.58, s * 0.5); ctx.lineTo(s * 0.7, s * 0.06); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x0 + s * 0.04, top + 6, s * 0.025, bot - top - 20);
    },
    front: function (ctx, s, r) {
      ctx.fillStyle = '#E8DDC8'; ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = C.board; ctx.fillRect(s * 0.08, s * 0.32, s * 0.84, s * 0.68);
      for (var i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? C.oat : C.tom; ctx.beginPath(); var x = s * 0.04 + i * s * 0.115; ctx.moveTo(x, s * 0.2); ctx.lineTo(x + s * 0.115, s * 0.2); ctx.lineTo(x + s * 0.115, s * 0.36); ctx.quadraticCurveTo(x + s * 0.0575, s * 0.42, x, s * 0.36); ctx.fill(); }
      ctx.fillStyle = '#F2C46B'; ctx.globalAlpha = 0.85; ctx.fillRect(s * 0.14, s * 0.48, s * 0.42, s * 0.3); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(43,27,19,.5)'; for (var k = 0; k < 4; k++) circle.call(ctx, s * (0.2 + k * 0.1), s * 0.7, s * 0.03, 'rgba(43,27,19,.45)');
      ctx.fillStyle = C.esp2; ctx.fillRect(s * 0.64, s * 0.46, s * 0.2, s * 0.54);
      ctx.fillStyle = '#F2C46B'; ctx.fillRect(s * 0.67, s * 0.5, s * 0.14, s * 0.18);
      chalkText(ctx, 'OPEN', s * 0.35, s * 0.6, s * 0.09, C.tom2, r, 'center');
      chalkText(ctx, 'Marlow & Bun', s * 0.5, s * 0.14, s * 0.1, C.esp, r, 'center');
      grain(ctx, s, r, 0.1, true);
    },
    pour: function (ctx, s, r) {
      ctx.fillStyle = '#1E1612'; ctx.fillRect(0, 0, s, s);
      var g = ctx.createLinearGradient(0, 0, 0, s * 0.3); g.addColorStop(0, '#8E8F8C'); g.addColorStop(1, '#3E3F3D');
      ctx.fillStyle = g; ctx.fillRect(s * 0.18, 0, s * 0.64, s * 0.22);
      ctx.fillStyle = '#2A2A28'; ctx.fillRect(s * 0.38, s * 0.22, s * 0.24, s * 0.08);
      ctx.fillStyle = '#C18048'; ctx.fillRect(s * 0.455, s * 0.3, s * 0.025, s * 0.36); ctx.fillRect(s * 0.52, s * 0.3, s * 0.025, s * 0.36);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(s * 0.3, s * 0.52, s * 0.4, s * 0.3);
      ctx.fillStyle = '#F3EFE8'; ctx.beginPath(); ctx.moveTo(s * 0.32, s * 0.58); ctx.lineTo(s * 0.68, s * 0.58); ctx.lineTo(s * 0.64, s * 0.86); ctx.lineTo(s * 0.36, s * 0.86); ctx.fill();
      ctx.fillStyle = '#B06A35'; ctx.beginPath(); ctx.ellipse(s * 0.5, s * 0.6, s * 0.17, s * 0.03, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#4D4C48'; ctx.fillRect(s * 0.12, s * 0.86, s * 0.76, s * 0.05);
      ctx.fillStyle = 'rgba(255,190,120,.08)'; ctx.beginPath(); ctx.arc(s * 0.5, s * 0.5, s * 0.45, 0, 6.28); ctx.fill();
      grain(ctx, s, r, 0.15, true);
    },
    focaccia: function (ctx, s, r) {
      wood(ctx, s, r, '#B98A5E', '#8A5E3A');
      shadow(ctx, s * 0.52, s * 0.56, s * 0.46, s * 0.4, 0.4);
      ctx.save(); ctx.translate(s * 0.5, s * 0.5); ctx.rotate(-0.12 + r() * 0.2);
      var g = ctx.createLinearGradient(-s * 0.35, -s * 0.3, s * 0.35, s * 0.3); g.addColorStop(0, '#F0C47A'); g.addColorStop(1, '#C98A3E');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-s * 0.36, -s * 0.3, s * 0.72, s * 0.6, s * 0.06); ctx.fill();
      for (var i = 0; i < 18; i++) circle.call(ctx, (r() - 0.5) * s * 0.62, (r() - 0.5) * s * 0.5, s * 0.012, 'rgba(120,70,20,.5)');
      for (var k = 0; k < 9; k++) { var x = (r() - 0.5) * s * 0.56, y = (r() - 0.5) * s * 0.44; circle.call(ctx, x, y, s * 0.045, C.tom); circle.call(ctx, x, y, s * 0.028, '#EE7A5A'); }
      ctx.strokeStyle = C.leaf; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (var j = 0; j < 7; j++) { var a = r() * 6.28, x2 = (r() - 0.5) * s * 0.56, y2 = (r() - 0.5) * s * 0.44; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 + Math.cos(a) * s * 0.05, y2 + Math.sin(a) * s * 0.05); ctx.stroke(); }
      ctx.restore();
    },
    beans: function (ctx, s, r) {
      ctx.fillStyle = C.oat; ctx.fillRect(0, 0, s, s); grain(ctx, s, r, 0.12);
      shadow(ctx, s * 0.5, s * 0.82, s * 0.32, s * 0.08, 0.5);
      ctx.fillStyle = '#C49A6C'; ctx.beginPath(); ctx.moveTo(s * 0.3, s * 0.22); ctx.lineTo(s * 0.7, s * 0.22); ctx.lineTo(s * 0.74, s * 0.82); ctx.lineTo(s * 0.26, s * 0.82); ctx.fill();
      ctx.fillStyle = '#A97E52'; ctx.fillRect(s * 0.3, s * 0.18, s * 0.4, s * 0.06);
      ctx.fillStyle = C.board; ctx.fillRect(s * 0.34, s * 0.4, s * 0.32, s * 0.26);
      chalkText(ctx, 'House', s * 0.5, s * 0.52, s * 0.085, C.chalk, r, 'center');
      chalkText(ctx, 'blend', s * 0.5, s * 0.62, s * 0.085, '#F2C46B', r, 'center');
      for (var i = 0; i < 14; i++) {
        var x = s * (0.05 + r() * 0.9), y = s * (0.84 + r() * 0.12); if (i < 5) { y = s * (0.06 + r() * 0.1); }
        ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 3); ctx.fillStyle = C.esp2; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.03, s * 0.02, 0, 0, 6.28); ctx.fill();
        ctx.strokeStyle = '#1a0f09'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-s * 0.022, 0); ctx.quadraticCurveTo(0, s * 0.006, s * 0.022, 0); ctx.stroke(); ctx.restore();
      }
    },
    counter: function (ctx, s, r) {
      ctx.fillStyle = '#3A2A22'; ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = 'rgba(255,240,210,.12)'; ctx.fillRect(s * 0.06, s * 0.08, s * 0.88, s * 0.8);
      for (var row = 0; row < 3; row++) {
        var y = s * (0.3 + row * 0.24);
        ctx.fillStyle = '#C9BBA4'; ctx.fillRect(s * 0.08, y, s * 0.84, s * 0.025);
        for (var k = 0; k < 4; k++) {
          var x = s * (0.18 + k * 0.21), kind = (row + k) % 3;
          if (kind === 0) bun(ctx, x, y - s * 0.06, s * 0.07, r);
          else if (kind === 1) { ctx.fillStyle = '#E3B27A'; ctx.beginPath(); ctx.ellipse(x, y - s * 0.05, s * 0.08, s * 0.045, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = C.tom; circle.call(ctx, x, y - s * 0.09, s * 0.02, C.tom); }
          else { ctx.fillStyle = '#F2E4C8'; ctx.fillRect(x - s * 0.07, y - s * 0.1, s * 0.14, s * 0.1); ctx.fillStyle = '#7A4A2A'; ctx.fillRect(x - s * 0.07, y - s * 0.06, s * 0.14, s * 0.02); }
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(s * 0.06, s * 0.08); ctx.lineTo(s * 0.4, s * 0.08); ctx.lineTo(s * 0.12, s * 0.88); ctx.lineTo(s * 0.06, s * 0.88); ctx.fill();
    },
    toast: function (ctx, s, r) {
      ctx.fillStyle = '#B9C4B0'; ctx.fillRect(0, 0, s, s); grain(ctx, s, r, 0.1, true);
      shadow(ctx, s * 0.52, s * 0.56, s * 0.44, s * 0.38, 0.35);
      circle.call(ctx, s * 0.5, s * 0.52, s * 0.42, '#F6F1E7');
      ctx.save(); ctx.translate(s * 0.5, s * 0.52); ctx.rotate(0.3);
      ctx.fillStyle = '#C98A44'; ctx.beginPath(); ctx.roundRect(-s * 0.24, -s * 0.2, s * 0.48, s * 0.42, s * 0.08); ctx.fill();
      ctx.fillStyle = '#EBC98E'; ctx.beginPath(); ctx.roundRect(-s * 0.21, -s * 0.17, s * 0.42, s * 0.36, s * 0.06); ctx.fill();
      for (var i = 0; i < 5; i++) { var x = -s * 0.13 + (i % 3) * s * 0.13, y = -s * 0.08 + Math.floor(i / 3) * s * 0.15; circle.call(ctx, x, y, s * 0.06, C.tom); circle.call(ctx, x, y, s * 0.04, '#EF8064'); ctx.fillStyle = '#F7D9C9'; for (var q = 0; q < 3; q++) circle.call(ctx, x + Math.cos(q * 2) * s * 0.022, y + Math.sin(q * 2) * s * 0.022, s * 0.007, '#FBE6D6'); }
      ctx.fillStyle = C.leaf; for (var j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse((r() - 0.5) * s * 0.3, (r() - 0.5) * s * 0.24, s * 0.03, s * 0.015, r() * 3, 0, 6.28); ctx.fill(); }
      ctx.restore();
    }
  };
  var order = ['latte', 'buns', 'board', 'front', 'croissant', 'iced', 'pour', 'focaccia', 'tulip', 'beans', 'counter', 'toast'];
  function make(type, size, seed, n) {
    var cv = document.createElement('canvas'); cv.width = cv.height = size;
    cv._args = [type, size, seed, n];
    paint(cv);
    return cv;
  }
  function paint(cv) {
    var a = cv._args, ctx = cv.getContext('2d'), r = rng(a[2] || 7);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, a[1], a[1]);
    (draw[a[0]] || draw.latte)(ctx, a[1], r, a[3] || 0);
    vignette(ctx, a[1], 0.28);
  }
  function avatar(size) {
    var cv = document.createElement('canvas'); cv.width = cv.height = size; var ctx = cv.getContext('2d'), r = rng(3);
    ctx.fillStyle = C.board; ctx.fillRect(0, 0, size, size);
    var g = ctx.createRadialGradient(size * 0.45, size * 0.45, 1, size / 2, size / 2, size * 0.42);
    g.addColorStop(0, '#D49A62'); g.addColorStop(1, '#6E3F1E'); circle.call(ctx, size / 2, size / 2, size * 0.38, g);
    ctx.save(); ctx.translate(size / 2, size / 2); rosetta(ctx, 0, 0, size * 0.32, r, true); ctx.restore();
    return cv;
  }
  w.SBPosts = { make: make, paint: paint, avatar: avatar, order: order, rng: rng, colors: C };
})(window);
