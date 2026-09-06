/* Wallpaper Maker — app.js (no build step, vanilla JS) */
(function () {
  'use strict';

  /* ================= Constants ================= */
  var STORAGE_KEY = 'wallpapermaker.v1';

  var PRESETS = [
    { label: '4K', w: 3840, h: 2160 },
    { label: '1440p', w: 2560, h: 1440 },
    { label: '1080p', w: 1920, h: 1080 },
    { label: 'UW 3440', w: 3440, h: 1440 },
    { label: 'UW 2560', w: 2560, h: 1080 },
    { label: '5K', w: 5120, h: 2880 },
    { label: 'iPhone', w: 1170, h: 2532 },
    { label: 'Android', w: 1080, h: 2400 }
  ];

  var MODES = [
    { value: 'linear', label: 'Linear' },
    { value: 'radial', label: 'Radial' },
    { value: 'conic', label: 'Conic' },
    { value: 'blobs', label: 'Blobs' }
  ];

  var IMAGE_FORMATS = [
    { value: 'png', label: 'PNG' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'webp', label: 'WebP' }
  ];

  var VIDEO_FORMATS = [
    { value: 'mp4', label: 'MP4' },
    { value: 'webm', label: 'WebM' }
  ];

  var FPS_OPTIONS = [15, 24, 30, 60];

  var NAME_A = ['Misty', 'Solar', 'Coral', 'Iris', 'Ember', 'Lunar', 'Verdant', 'Dusk',
    'Ocean', 'Autumn', 'Frost', 'Amber', 'Sage', 'Orchid', 'Slate', 'Aurora'];
  var NAME_B = ['Horizon', 'Bloom', 'Drift', 'Veil', 'Haze', 'Field', 'Grove', 'Cove',
    'Ridge', 'Shore', 'Meadow', 'Summit', 'Tide', 'Glade', 'Whisper', 'Reach'];

  /* ================= DOM helpers ================= */
  function $(sel) { return document.querySelector(sel); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null && text !== '') e.textContent = text;
    return e;
  }

  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function even(n) { n = Math.round(n); return n - (n % 2); }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function randInt(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[randInt(arr.length)]; }

  function fmtNum(v) { return String(Math.round(v * 100) / 100); }
  function fmtPct(v) { return Math.round(v * 100) + '%'; }
  function fmtDeg(v) { return Math.round(v) + '°'; }
  function fmtInt(v) { return String(Math.round(v)); }
  function fmtPx(v) { return Math.round(v) + 'px'; }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn(); }, wait);
    };
  }

  /* ================= Color helpers ================= */
  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return { r: 128, g: 128, b: 128 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    var c = function (v) {
      v = Math.round(clamp(v, 0, 255));
      return v.toString(16).padStart(2, '0');
    };
    return '#' + c(r) + c(g) + c(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var hue2rgb = function (p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function hslToHex(h, s, l) {
    var c = hslToRgb(h, s, l);
    return rgbToHex(c.r, c.g, c.b);
  }

  function rgbaStr(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  /* Applies hue drift and returns an {r,g,b} color for a stored hex */
  function colorAt(hex, cfg, time) {
    var rgb = hexToRgb(hex);
    if (cfg.anim.hueDriftSpeed) {
      var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      hsl.h = (hsl.h + time * cfg.anim.hueDriftSpeed * 360) % 360;
      return hslToRgb(hsl.h, hsl.s, hsl.l);
    }
    return rgb;
  }

  /* ================= Random generation ================= */
  function randomPalette(n) {
    var base = Math.random() * 360;
    var mode = randInt(3);
    var colors = [];
    for (var i = 0; i < n; i++) {
      var h;
      if (mode === 0) h = base + (Math.random() - 0.5) * 70;
      else if (mode === 1) h = base + (Math.random() < 0.5 ? 0 : 180) + (Math.random() - 0.5) * 40;
      else h = base + i * (360 / n) + (Math.random() - 0.5) * 30;
      var s = 45 + Math.random() * 40;
      var l = 35 + Math.random() * 30;
      colors.push(hslToHex(h, s, l));
    }
    return colors;
  }

  function randomStops() {
    var n = 2 + randInt(4); // 2..5
    var palette = randomPalette(n);
    var stops = [];
    for (var i = 0; i < n; i++) {
      stops.push({ color: palette[i], pos: i / (n - 1) });
    }
    return stops;
  }

  function randomLayer() {
    var mode = pick(MODES).value;
    return {
      enabled: true,
      blend: 0.8 + Math.random() * 0.2,
      mode: mode,
      stops: randomStops(),
      angle: Math.random() * 360,
      center: { x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.4 },
      radius: 55 + Math.random() * 45,
      blobCount: 4 + randInt(6),
      blobSize: 18 + Math.random() * 26,
      blobSoftness: 0.4 + Math.random() * 0.4,
      blobSpread: 0.5 + Math.random() * 0.5
    };
  }

  function randomName() { return pick(NAME_A) + ' ' + pick(NAME_B); }

  function detectDeviceResolution() {
    var dpr = window.devicePixelRatio || 1;
    var w = clamp(even(window.screen.width * dpr), 320, 7680);
    var h = clamp(even(window.screen.height * dpr), 320, 7680);
    return { width: w, height: h };
  }

  function randomConfig() {
    var res = detectDeviceResolution();
    var layerCount = 1 + randInt(3);
    var layers = [];
    for (var i = 0; i < layerCount; i++) layers.push(randomLayer());
    return {
      id: uid(),
      name: randomName(),
      resolution: {
        deviceExact: true,
        width: res.width,
        height: res.height,
        lockAspect: true,
        aspectRatio: res.width / res.height
      },
      layers: layers,
      anim: {
        enabled: Math.random() < 0.7,
        masterSpeed: 0.5 + Math.random(),
        hueDriftSpeed: Math.random() < 0.5 ? 0 : 0.02 + Math.random() * 0.08,
        angleSpinSpeed: Math.random() < 0.45 ? 0 : 0.02 + Math.random() * 0.08,
        focalDrift: { enabled: false, speed: 0.06, amount: 0.12 },
        stopOsc: { enabled: false, speed: 0.12, amount: 0.08 },
        sheen: { enabled: Math.random() < 0.25, speed: 0.12, strength: 0.18, width: 0.35 },
        flow: { enabled: Math.random() < 0.2, amount: 0.12 }
      },
      looks: {
        grain: { enabled: false, amount: 0.1, size: 0.5 },
        vignette: { enabled: true, strength: 0.35, falloff: 0.5 },
        kaleido: { enabled: false, segments: 8, smoothing: 0.5 },
        ditherExport: false
      }
    };
  }

  /* ================= Normalization (load safety) ================= */
  function mergeObj(src, def) {
    var out = {};
    for (var k in def) {
      out[k] = (src && src[k] !== undefined) ? src[k] : def[k];
    }
    return out;
  }

  function normalizeLayer(l) {
    var o = mergeObj(l, {
      enabled: true, blend: 1, mode: 'linear', angle: 0, radius: 80,
      blobCount: 6, blobSize: 28, blobSoftness: 0.6, blobSpread: 0.6
    });
    o.center = mergeObj(l && l.center, { x: 0.5, y: 0.5 });
    if (Array.isArray(l && l.stops) && l.stops.length >= 2) {
      o.stops = l.stops.map(function (s) { return mergeObj(s, { color: '#8892a0', pos: 0 }); });
    } else {
      o.stops = [{ color: '#7a8ea8', pos: 0 }, { color: '#1a1f27', pos: 1 }];
    }
    if (MODES.every(function (m) { return m.value !== o.mode; })) o.mode = 'linear';
    return o;
  }

  function normalizeAnim(a) {
    var o = mergeObj(a, { enabled: false, masterSpeed: 1, hueDriftSpeed: 0, angleSpinSpeed: 0 });
    o.focalDrift = mergeObj(a && a.focalDrift, { enabled: false, speed: 0.06, amount: 0.12 });
    o.stopOsc = mergeObj(a && a.stopOsc, { enabled: false, speed: 0.12, amount: 0.08 });
    o.sheen = mergeObj(a && a.sheen, { enabled: false, speed: 0.12, strength: 0.18, width: 0.35 });
    o.flow = mergeObj(a && a.flow, { enabled: false, amount: 0.12 });
    return o;
  }

  function normalizeLooks(l) {
    var o = mergeObj(l, { ditherExport: false });
    o.grain = mergeObj(l && l.grain, { enabled: false, amount: 0.1, size: 0.5 });
    o.vignette = mergeObj(l && l.vignette, { enabled: true, strength: 0.35, falloff: 0.5 });
    o.kaleido = mergeObj(l && l.kaleido, { enabled: false, segments: 8, smoothing: 0.5 });
    return o;
  }

  function normalizeConfig(c) {
    return {
      id: c.id || uid(),
      name: c.name || randomName(),
      resolution: mergeObj(c.resolution, {
        deviceExact: true, width: 0, height: 0, lockAspect: true, aspectRatio: 16 / 9
      }),
      layers: (Array.isArray(c.layers) && c.layers.length ? c.layers : [randomLayer()]).map(normalizeLayer),
      anim: normalizeAnim(c.anim),
      looks: normalizeLooks(c.looks)
    };
  }

  /* ================= State ================= */
  var state = {
    sets: [],
    activeId: null,
    animTime: 0
  };
  var selectedLayerIndex = 0;
  var exportSettings = { imageFormat: 'png', videoFormat: 'mp4', duration: 5, fps: 30, quality: 0.9 };
  var recording = false;
  var refs = {};

  function activeConfig() {
    for (var i = 0; i < state.sets.length; i++) {
      if (state.sets[i].id === state.activeId) return state.sets[i];
    }
    return state.sets[0];
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.sets) && parsed.sets.length) {
          var sets = parsed.sets.map(normalizeConfig);
          var activeId = sets.some(function (s) { return s.id === parsed.activeId; })
            ? parsed.activeId : sets[0].id;
          return { sets: sets, activeId: activeId };
        }
      }
    } catch (e) { /* ignore corrupt storage */ }
    return null;
  }

  function saveState() {
    try {
      var data = { sets: state.sets, activeId: state.activeId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* storage full / unavailable */ }
  }

  var scheduleSave = debounce(function () {
    saveState();
    updateActiveThumb();
  }, 150);

  function onConfigChanged() {
    renderPreview();
    scheduleSave();
  }

  /* ================= Rendering ================= */
  var previewCanvas = null;
  var previewCtx = null;

  function focalPoint(layer, cfg, time) {
    var x = layer.center.x, y = layer.center.y;
    var fd = cfg.anim.focalDrift;
    if (fd.enabled && fd.amount > 0) {
      x += Math.sin(time * fd.speed * Math.PI * 2) * fd.amount;
      y += Math.cos(time * fd.speed * Math.PI * 2 * 0.83) * fd.amount;
    }
    return { x: clamp01(x), y: clamp01(y) };
  }

  function spinAngle(cfg, time) {
    return time * cfg.anim.angleSpinSpeed * 360;
  }

  function applyStops(g, stops, cfg, time) {
    var osc = cfg.anim.stopOsc;
    var flow = cfg.anim.flow;
    for (var i = 0; i < stops.length; i++) {
      var st = stops[i];
      var pos = st.pos;
      if (osc.enabled && osc.amount > 0) {
        pos += Math.sin(time * osc.speed * Math.PI * 2 + i * 1.7) * osc.amount * 0.5;
      }
      if (flow.enabled && flow.amount > 0) {
        pos += (Math.sin(time * 0.6 + i * 2.3) + Math.sin(time * 1.1 + i * 1.1)) * 0.5 * flow.amount;
      }
      var rgb = colorAt(st.color, cfg, time);
      g.addColorStop(clamp01(pos), rgbaStr(rgb, 1));
    }
  }

  function makeConic(ctx, startAngle, x, y) {
    if (typeof ctx.createConicGradient === 'function') {
      return ctx.createConicGradient(startAngle, x, y);
    }
    return ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  function drawLayer(ctx, W, H, layer, cfg, time) {
    var stops = layer.stops;
    if (layer.mode === 'linear') {
      var angle = (layer.angle + spinAngle(cfg, time)) * Math.PI / 180;
      var dx = Math.cos(angle), dy = Math.sin(angle);
      var cx = W / 2, cy = H / 2;
      var L = Math.hypot(W, H) / 2;
      var g = ctx.createLinearGradient(cx - dx * L, cy - dy * L, cx + dx * L, cy + dy * L);
      applyStops(g, stops, cfg, time);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (layer.mode === 'radial') {
      var c = focalPoint(layer, cfg, time);
      var r = (layer.radius / 100) * Math.hypot(W, H) / 2;
      var g2 = ctx.createRadialGradient(c.x * W, c.y * H, 0, c.x * W, c.y * H, r);
      applyStops(g2, stops, cfg, time);
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
    } else if (layer.mode === 'conic') {
      var c2 = focalPoint(layer, cfg, time);
      var start = (layer.angle + spinAngle(cfg, time)) * Math.PI / 180;
      var g3 = makeConic(ctx, start, c2.x * W, c2.y * H);
      applyStops(g3, stops, cfg, time);
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, W, H);
    } else if (layer.mode === 'blobs') {
      drawBlobs(ctx, W, H, layer, cfg, time);
    }
  }

  function drawBlobs(ctx, W, H, layer, cfg, time) {
    var colors = layer.stops.map(function (s) { return s.color; });
    var n = Math.max(1, Math.round(layer.blobCount));
    var anchor = focalPoint(layer, cfg, time);
    var ax = anchor.x * W, ay = anchor.y * H;
    var spread = Math.max(0.05, layer.blobSpread);
    var spreadPx = Math.min(W, H) * 0.5 * spread;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) {
      var seed = i * 2.39996323;
      var bx = ax + Math.cos(seed) * spreadPx * (0.4 + 0.6 * Math.sin(seed * 0.7));
      var by = ay + Math.sin(seed) * spreadPx * (0.4 + 0.6 * Math.sin(seed * 1.3));
      var wx = Math.sin(time * 0.5 + seed) * spreadPx * 0.28 + Math.sin(time * 0.8 + seed * 1.7) * spreadPx * 0.16;
      var wy = Math.cos(time * 0.45 + seed * 0.9) * spreadPx * 0.28 + Math.sin(time * 0.6 + seed * 2.1) * spreadPx * 0.16;
      var x = bx + wx, y = by + wy;
      var r = (layer.blobSize / 100) * Math.min(W, H) * (0.8 + 0.4 * Math.sin(seed * 0.7 + time * 0.2 + i));
      var rgb = colorAt(colors[i % colors.length], cfg, time);
      var soft = clamp01(layer.blobSoftness);
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgbaStr(rgb, 0.85));
      g.addColorStop(soft, rgbaStr(rgb, 0.5));
      g.addColorStop(1, rgbaStr(rgb, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  var kaleidoBases = {};
  function getKaleidoBase(W, H) {
    var key = W + 'x' + H;
    var c = kaleidoBases[key];
    if (!c) {
      c = document.createElement('canvas');
      c.width = W; c.height = H;
      kaleidoBases[key] = c;
    }
    return c;
  }

  function drawKaleidoscopeLayer(ctx, W, H, layer, cfg, time) {
    var seg = Math.max(2, Math.round(cfg.looks.kaleido.segments));
    var smoothing = clamp01(cfg.looks.kaleido.smoothing);
    var base = getKaleidoBase(W, H);
    var bctx = base.getContext('2d');
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, W, H);
    drawLayer(bctx, W, H, layer, cfg, time);

    var cx = W / 2, cy = H / 2;
    var R = Math.hypot(W, H) / 2;
    var angle = (Math.PI * 2) / seg;
    var overlap = smoothing * angle * 0.3;

    ctx.save();
    ctx.globalAlpha = clamp01(layer.blend);
    ctx.translate(cx, cy);
    for (var i = 0; i < seg; i++) {
      ctx.save();
      ctx.rotate(i * angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, -overlap, angle + overlap);
      ctx.closePath();
      ctx.clip();
      if (i % 2 === 0) {
        ctx.drawImage(base, -cx, -cy);
      } else {
        ctx.scale(-1, 1);
        ctx.drawImage(base, -cx, -cy);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function compositeLayer(ctx, W, H, layer, cfg, time) {
    if (cfg.looks.kaleido.enabled && layer.mode !== 'blobs') {
      drawKaleidoscopeLayer(ctx, W, H, layer, cfg, time);
    } else {
      ctx.save();
      ctx.globalAlpha = clamp01(layer.blend);
      drawLayer(ctx, W, H, layer, cfg, time);
      ctx.restore();
    }
  }

  function drawSheen(ctx, W, H, cfg, time) {
    var s = cfg.anim.sheen;
    var diag = Math.hypot(W, H);
    var t = ((time * s.speed) % 1 + 1) % 1;
    var pos = t * 2 - 1;
    var cx = W / 2, cy = H / 2;
    var ang = -45 * Math.PI / 180;
    var dx = Math.cos(ang), dy = Math.sin(ang);
    var bandW = diag * (0.04 + s.width * 0.28);
    var bx = cx + dx * pos * diag * 0.65;
    var by = cy + dy * pos * diag * 0.65;
    var g = ctx.createLinearGradient(bx - dx * bandW, by - dy * bandW, bx + dx * bandW, by + dy * bandW);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,' + s.strength + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawVignette(ctx, W, H, cfg) {
    var v = cfg.looks.vignette;
    var cx = W / 2, cy = H / 2;
    var inner = Math.min(W, H) * 0.45 * (1 - v.falloff * 0.75);
    var outer = Math.hypot(W, H) * 0.55;
    var g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + v.strength + ')');
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  var grainTile = null;
  function getGrainTile() {
    if (grainTile) return grainTile;
    var size = 128;
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var ctx = c.getContext('2d');
    var seed = 12345;
    function rnd() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    var img = ctx.createImageData(size, size);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = Math.floor(rnd() * 256);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    grainTile = c;
    return c;
  }

  function drawGrain(ctx, W, H, cfg) {
    var g = cfg.looks.grain;
    var tile = getGrainTile();
    var s = 0.5 + g.size * 2.0;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = g.amount;
    ctx.scale(s, s);
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    ctx.fillRect(0, 0, W / s, H / s);
    ctx.restore();
  }

  function renderWallpaper(ctx, W, H, cfg, time) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#080b0f';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    for (var i = 0; i < cfg.layers.length; i++) {
      var layer = cfg.layers[i];
      if (!layer.enabled) continue;
      compositeLayer(ctx, W, H, layer, cfg, time);
    }

    if (cfg.anim.sheen.enabled) drawSheen(ctx, W, H, cfg, time);
    if (cfg.looks.vignette.enabled) drawVignette(ctx, W, H, cfg);
    if (cfg.looks.grain.enabled) drawGrain(ctx, W, H, cfg);
  }

  function applyOrderedDither(ctx, W, H) {
    var bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    var amount = 7;
    var img = ctx.getImageData(0, 0, W, H);
    var d = img.data;
    for (var y = 0; y < H; y++) {
      var row = y & 3;
      for (var x = 0; x < W; x++) {
        var i = (y * W + x) * 4;
        var t = Math.round((bayer[row][x & 3] / 16 - 0.5) * amount);
        d[i] += t; d[i + 1] += t; d[i + 2] += t;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function effectiveResolution(cfg) {
    var r = cfg.resolution;
    if (r.deviceExact) return detectDeviceResolution();
    return { width: clamp(even(r.width), 320, 7680), height: clamp(even(r.height), 320, 7680) };
  }

  /* ================= Preview ================= */
  function renderPreview() {
    var cfg = activeConfig();
    var vw = previewCanvas.width, vh = previewCanvas.height;
    previewCtx.setTransform(1, 0, 0, 1, 0, 0);
    previewCtx.fillStyle = '#05070a';
    previewCtx.fillRect(0, 0, vw, vh);

    var res = effectiveResolution(cfg);
    var wallAspect = res.width / res.height;
    var viewAspect = vw / vh;
    var W, H, ox, oy;
    if (wallAspect > viewAspect) {
      W = vw; H = vw / wallAspect;
    } else {
      H = vh; W = vh * wallAspect;
    }
    ox = (vw - W) / 2; oy = (vh - H) / 2;

    previewCtx.save();
    previewCtx.translate(ox, oy);
    renderWallpaper(previewCtx, W, H, cfg, state.animTime);
    previewCtx.restore();
  }

  function sizePreview() {
    var dpr = window.devicePixelRatio || 1;
    previewCanvas.width = Math.round(window.innerWidth * dpr);
    previewCanvas.height = Math.round(window.innerHeight * dpr);
    previewCanvas.style.width = window.innerWidth + 'px';
    previewCanvas.style.height = window.innerHeight + 'px';
    renderPreview();
  }

  function renderThumb(cfg) {
    var W = 120, H = 68;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    renderWallpaper(ctx, W, H, cfg, 0);
    return c.toDataURL('image/jpeg', 0.7);
  }

  function updateActiveThumb() {
    var cfg = activeConfig();
    if (!cfg) return;
    cfg.thumb = renderThumb(cfg);
    var img = document.querySelector('.chip[data-id="' + cfg.id + '"] .chip-thumb');
    if (img) img.src = cfg.thumb;
  }

  /* ================= Animation loop ================= */
  var lastTs = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    var dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : 0;
    lastTs = ts;
    var cfg = activeConfig();
    if (!recording && cfg && cfg.anim.enabled) {
      state.animTime += dt * cfg.anim.masterSpeed;
    }
    renderPreview();
  }

  /* ================= Control builders ================= */
  function sliderControl(opts) {
    var row = el('div', 'control');
    var lab = el('span', 'control-label', opts.label);
    var range = el('input');
    range.type = 'range';
    range.min = opts.min; range.max = opts.max; range.step = opts.step;
    range.value = opts.value;
    var val = el('span', 'control-value', opts.format ? opts.format(opts.value) : fmtNum(opts.value));
    range.addEventListener('input', function () {
      var v = parseFloat(range.value);
      val.textContent = opts.format ? opts.format(v) : fmtNum(v);
      if (opts.onChange) opts.onChange(v);
    });
    if (opts.onCommit) {
      range.addEventListener('change', function () {
        opts.onCommit(parseFloat(range.value));
      });
    }
    row.append(lab, range, val);
    row.range = range;
    row.valueEl = val;
    return row;
  }

  function checkControl(opts) {
    var row = el('label', 'control control-check');
    var box = el('input');
    box.type = 'checkbox';
    box.checked = !!opts.checked;
    var txt = el('span', 'control-label', opts.label);
    row.append(box, txt);
    row.addEventListener('click', function (e) { e.stopPropagation(); });
    box.addEventListener('change', function () { opts.onChange(box.checked); });
    return row;
  }

  function chipGroup(opts) {
    var wrap = el('div', 'chipgroup');
    opts.options.forEach(function (opt) {
      var b = el('button', 'chip-btn' + (String(opt.value) === String(opts.selected) ? ' selected' : ''), opt.label);
      b.type = 'button';
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var btns = wrap.querySelectorAll('.chip-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
        b.classList.add('selected');
        opts.onChange(opt.value);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function section(title, contentEls) {
    var sec = el('section', 'panel-section');
    var h = el('h3', 'section-title', title);
    sec.appendChild(h);
    var body = el('div', 'section-body');
    contentEls.forEach(function (e) { body.appendChild(e); });
    sec.appendChild(body);
    h.addEventListener('click', function () { sec.classList.toggle('collapsed'); });
    return sec;
  }

  /* ================= Panel sections ================= */
  function buildResolutionSection(cfg) {
    var r = cfg.resolution;
    var els = [];
    els.push(checkControl({
      label: 'Use device resolution',
      checked: r.deviceExact,
      onChange: function (v) {
        r.deviceExact = v;
        if (v) {
          var d = detectDeviceResolution();
          r.width = d.width; r.height = d.height;
        }
        buildPanel();
        onConfigChanged();
      }
    }));

    if (r.deviceExact) {
      els.push(el('div', 'control-note', r.width + ' × ' + r.height + ' (device pixels)'));
    } else {
      var presetWrap = el('div', 'chipgroup');
      PRESETS.forEach(function (p) {
        var b = el('button', 'chip-btn', p.label);
        b.type = 'button';
        b.addEventListener('click', function () {
          r.width = p.w; r.height = p.h;
          if (r.lockAspect) r.aspectRatio = p.w / p.h;
          buildPanel();
          onConfigChanged();
        });
        presetWrap.appendChild(b);
      });
      els.push(presetWrap);

      els.push(checkControl({
        label: 'Lock aspect ratio',
        checked: r.lockAspect,
        onChange: function (v) {
          r.lockAspect = v;
          if (v) r.aspectRatio = r.width / r.height;
          onConfigChanged();
        }
      }));

      var wSlider = sliderControl({
        label: 'Width', min: 320, max: 7680, step: 10, value: r.width, format: fmtPx,
        onChange: function (v) {
          r.width = clamp(even(v), 320, 7680);
          if (r.lockAspect && r.aspectRatio) {
            r.height = clamp(even(r.width / r.aspectRatio), 320, 7680);
            syncResHeight();
          }
          onConfigChanged();
        }
      });
      var hSlider = sliderControl({
        label: 'Height', min: 320, max: 7680, step: 10, value: r.height, format: fmtPx,
        onChange: function (v) {
          r.height = clamp(even(v), 320, 7680);
          if (r.lockAspect && r.aspectRatio) {
            r.width = clamp(even(r.height * r.aspectRatio), 320, 7680);
            syncResWidth();
          }
          onConfigChanged();
        }
      });
      els.push(wSlider, hSlider);
      refs.resWidth = wSlider;
      refs.resHeight = hSlider;
    }

    return section('Resolution', els);
  }

  function syncResWidth() {
    if (!refs.resWidth) return;
    var r = activeConfig().resolution;
    refs.resWidth.range.value = r.width;
    refs.resWidth.valueEl.textContent = fmtPx(r.width);
  }

  function syncResHeight() {
    if (!refs.resHeight) return;
    var r = activeConfig().resolution;
    refs.resHeight.range.value = r.height;
    refs.resHeight.valueEl.textContent = fmtPx(r.height);
  }

  function buildLayersSection(cfg) {
    var els = [];
    els.push(sliderControl({
      label: 'Layers', min: 1, max: 3, step: 1, value: cfg.layers.length, format: fmtInt,
      onCommit: function (v) {
        var n = Math.round(v);
        while (cfg.layers.length < n) cfg.layers.push(randomLayer());
        while (cfg.layers.length > n) cfg.layers.pop();
        if (selectedLayerIndex >= cfg.layers.length) selectedLayerIndex = cfg.layers.length - 1;
        buildPanel();
        onConfigChanged();
      }
    }));

    cfg.layers.forEach(function (layer, i) {
      var card = el('div', 'layer-card' + (i === selectedLayerIndex ? ' selected' : ''));
      card.addEventListener('click', function () {
        selectedLayerIndex = i;
        buildPanel();
      });

      var head = el('div', 'layer-head');
      head.appendChild(checkControl({
        label: 'Layer ' + (i + 1),
        checked: layer.enabled,
        onChange: function (v) { layer.enabled = v; onConfigChanged(); }
      }));
      head.appendChild(chipGroup({
        options: MODES,
        selected: layer.mode,
        onChange: function (v) {
          layer.mode = v;
          selectedLayerIndex = i;
          buildPanel();
          onConfigChanged();
        }
      }));
      card.appendChild(head);
      card.appendChild(sliderControl({
        label: 'Strength', min: 0, max: 1, step: 0.01, value: layer.blend, format: fmtPct,
        onChange: function (v) { layer.blend = v; onConfigChanged(); }
      }));
      els.push(card);
    });

    return section('Layers', els);
  }

  function renormalizeStops(stops) {
    for (var i = 0; i < stops.length; i++) {
      stops[i].pos = i / (stops.length - 1);
    }
  }

  function buildColorsSection(cfg, layer) {
    var els = [];
    els.push(sliderControl({
      label: 'Stops', min: 2, max: 8, step: 1, value: layer.stops.length, format: fmtInt,
      onCommit: function (v) {
        var n = Math.round(v);
        while (layer.stops.length < n) {
          var last = layer.stops[layer.stops.length - 1];
          layer.stops.push({ color: last ? last.color : '#8892a0', pos: 1 });
        }
        while (layer.stops.length > n) layer.stops.pop();
        renormalizeStops(layer.stops);
        buildPanel();
        onConfigChanged();
      }
    }));

    layer.stops.forEach(function (stop) {
      var row = el('div', 'stop-row');
      var color = el('input');
      color.type = 'color';
      color.value = stop.color;
      color.addEventListener('input', function () {
        stop.color = color.value;
        onConfigChanged();
      });
      row.appendChild(color);
      if (layer.mode !== 'blobs') {
        var posSlider = sliderControl({
          label: '', min: 0, max: 100, step: 1, value: stop.pos * 100, format: fmtPct,
          onChange: function (v) {
            stop.pos = v / 100;
            onConfigChanged();
          }
        });
        posSlider.querySelector('.control-label').style.display = 'none';
        row.appendChild(posSlider);
      }
      els.push(row);
    });

    return section(layer.mode === 'blobs' ? 'Blob Colors' : 'Colors', els);
  }

  function buildShapeSection(cfg, layer) {
    var els = [];
    var m = layer.mode;
    if (m === 'linear') {
      els.push(sliderControl({
        label: 'Angle', min: 0, max: 360, step: 1, value: layer.angle, format: fmtDeg,
        onChange: function (v) { layer.angle = v; onConfigChanged(); }
      }));
    } else if (m === 'radial') {
      els.push(sliderControl({
        label: 'Center X', min: 0, max: 100, step: 1, value: layer.center.x * 100, format: fmtPct,
        onChange: function (v) { layer.center.x = v / 100; onConfigChanged(); }
      }));
      els.push(sliderControl({
        label: 'Center Y', min: 0, max: 100, step: 1, value: layer.center.y * 100, format: fmtPct,
        onChange: function (v) { layer.center.y = v / 100; onConfigChanged(); }
      }));
      els.push(sliderControl({
        label: 'Radius', min: 10, max: 200, step: 1, value: layer.radius, format: fmtPct,
        onChange: function (v) { layer.radius = v; onConfigChanged(); }
      }));
    } else if (m === 'conic') {
      els.push(sliderControl({
        label: 'Angle', min: 0, max: 360, step: 1, value: layer.angle, format: fmtDeg,
        onChange: function (v) { layer.angle = v; onConfigChanged(); }
      }));
      els.push(sliderControl({
        label: 'Center X', min: 0, max: 100, step: 1, value: layer.center.x * 100, format: fmtPct,
        onChange: function (v) { layer.center.x = v / 100; onConfigChanged(); }
      }));
      els.push(sliderControl({
        label: 'Center Y', min: 0, max: 100, step: 1, value: layer.center.y * 100, format: fmtPct,
        onChange: function (v) { layer.center.y = v / 100; onConfigChanged(); }
      }));
    } else if (m === 'blobs') {
      els.push(sliderControl({
        label: 'Blob count', min: 2, max: 20, step: 1, value: layer.blobCount, format: fmtInt,
        onChange: function (v) { layer.blobCount = v; onConfigChanged(); }
      }));
      els.push(sliderControl({
        label: 'Blob size', min: 5, max: 60, step: 1, value: layer.blobSize, format: fmtPct,
        onChange: function (v) { layer.blobSize = v; onConfigChanged(); }
      }));
      els.push(sliderControl({
        label: 'Softness', min: 0.05, max: 0.95, step: 0.01, value: layer.blobSoftness, format: fmtPct,
        onChange: function (v) { layer.blobSoftness = v; onConfigChanged(); }
      }));
      els.push(sliderControl({
        label: 'Spread', min: 0.2, max: 1, step: 0.01, value: layer.blobSpread, format: fmtPct,
        onChange: function (v) { layer.blobSpread = v; onConfigChanged(); }
      }));
    }
    return section('Shape', els);
  }

  function buildAnimSection(cfg) {
    var a = cfg.anim;
    var els = [];
    els.push(checkControl({
      label: 'Animation enabled',
      checked: a.enabled,
      onChange: function (v) { a.enabled = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Global speed', min: 0.1, max: 3, step: 0.05, value: a.masterSpeed, format: fmtNum,
      onChange: function (v) { a.masterSpeed = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Angle spin', min: 0, max: 0.2, step: 0.001, value: a.angleSpinSpeed, format: fmtNum,
      onChange: function (v) { a.angleSpinSpeed = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Hue drift', min: 0, max: 0.2, step: 0.001, value: a.hueDriftSpeed, format: fmtNum,
      onChange: function (v) { a.hueDriftSpeed = v; onConfigChanged(); }
    }));
    els.push(checkControl({
      label: 'Focal movement',
      checked: a.focalDrift.enabled,
      onChange: function (v) { a.focalDrift.enabled = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Focal speed', min: 0, max: 0.5, step: 0.01, value: a.focalDrift.speed, format: fmtNum,
      onChange: function (v) { a.focalDrift.speed = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Focal amount', min: 0, max: 0.5, step: 0.01, value: a.focalDrift.amount, format: fmtPct,
      onChange: function (v) { a.focalDrift.amount = v; onConfigChanged(); }
    }));
    els.push(checkControl({
      label: 'Stop oscillation',
      checked: a.stopOsc.enabled,
      onChange: function (v) { a.stopOsc.enabled = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Osc speed', min: 0, max: 0.5, step: 0.01, value: a.stopOsc.speed, format: fmtNum,
      onChange: function (v) { a.stopOsc.speed = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Osc amount', min: 0, max: 0.3, step: 0.01, value: a.stopOsc.amount, format: fmtPct,
      onChange: function (v) { a.stopOsc.amount = v; onConfigChanged(); }
    }));
    return section('Animation', els);
  }

  function buildLooksSection(cfg) {
    var lk = cfg.looks;
    var a = cfg.anim;
    var els = [];

    els.push(checkControl({
      label: 'Grain',
      checked: lk.grain.enabled,
      onChange: function (v) { lk.grain.enabled = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Grain amount', min: 0, max: 0.5, step: 0.01, value: lk.grain.amount, format: fmtPct,
      onChange: function (v) { lk.grain.amount = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Grain size', min: 0, max: 1, step: 0.01, value: lk.grain.size, format: fmtPct,
      onChange: function (v) { lk.grain.size = v; onConfigChanged(); }
    }));

    els.push(checkControl({
      label: 'Vignette',
      checked: lk.vignette.enabled,
      onChange: function (v) { lk.vignette.enabled = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Vignette strength', min: 0, max: 1, step: 0.01, value: lk.vignette.strength, format: fmtPct,
      onChange: function (v) { lk.vignette.strength = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Vignette falloff', min: 0, max: 1, step: 0.01, value: lk.vignette.falloff, format: fmtPct,
      onChange: function (v) { lk.vignette.falloff = v; onConfigChanged(); }
    }));

    els.push(checkControl({
      label: 'Kaleidoscope',
      checked: lk.kaleido.enabled,
      onChange: function (v) { lk.kaleido.enabled = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Segments', min: 2, max: 24, step: 1, value: lk.kaleido.segments, format: fmtInt,
      onChange: function (v) { lk.kaleido.segments = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Seam smoothing', min: 0, max: 1, step: 0.01, value: lk.kaleido.smoothing, format: fmtPct,
      onChange: function (v) { lk.kaleido.smoothing = v; onConfigChanged(); }
    }));

    els.push(checkControl({
      label: 'Sheen sweep',
      checked: a.sheen.enabled,
      onChange: function (v) { a.sheen.enabled = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Sheen speed', min: 0, max: 0.5, step: 0.01, value: a.sheen.speed, format: fmtNum,
      onChange: function (v) { a.sheen.speed = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Sheen strength', min: 0, max: 0.6, step: 0.01, value: a.sheen.strength, format: fmtPct,
      onChange: function (v) { a.sheen.strength = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Sheen width', min: 0, max: 1, step: 0.01, value: a.sheen.width, format: fmtPct,
      onChange: function (v) { a.sheen.width = v; onConfigChanged(); }
    }));

    els.push(checkControl({
      label: 'Flow wobble',
      checked: a.flow.enabled,
      onChange: function (v) { a.flow.enabled = v; onConfigChanged(); }
    }));
    els.push(sliderControl({
      label: 'Flow amount', min: 0, max: 0.5, step: 0.01, value: a.flow.amount, format: fmtPct,
      onChange: function (v) { a.flow.amount = v; onConfigChanged(); }
    }));

    return section('Looks / Textures', els);
  }

  function buildExportSection(cfg) {
    var els = [];

    var fmtLabel = el('div', 'control');
    fmtLabel.appendChild(el('span', 'control-label', 'Image format'));
    fmtLabel.appendChild(chipGroup({
      options: IMAGE_FORMATS,
      selected: exportSettings.imageFormat,
      onChange: function (v) { exportSettings.imageFormat = v; }
    }));
    els.push(fmtLabel);

    var vidLabel = el('div', 'control');
    vidLabel.appendChild(el('span', 'control-label', 'Video format'));
    vidLabel.appendChild(chipGroup({
      options: VIDEO_FORMATS,
      selected: exportSettings.videoFormat,
      onChange: function (v) { exportSettings.videoFormat = v; }
    }));
    els.push(vidLabel);

    els.push(sliderControl({
      label: 'Duration', min: 1, max: 60, step: 1, value: exportSettings.duration, format: function (v) { return fmtInt(v) + 's'; },
      onChange: function (v) { exportSettings.duration = Math.round(v); }
    }));

    var fpsLabel = el('div', 'control');
    fpsLabel.appendChild(el('span', 'control-label', 'Frame rate'));
    fpsLabel.appendChild(chipGroup({
      options: FPS_OPTIONS.map(function (f) { return { value: f, label: f + ' fps' }; }),
      selected: exportSettings.fps,
      onChange: function (v) { exportSettings.fps = v; }
    }));
    els.push(fpsLabel);

    els.push(sliderControl({
      label: 'Quality', min: 0.1, max: 1, step: 0.01, value: exportSettings.quality, format: fmtPct,
      onChange: function (v) { exportSettings.quality = v; }
    }));

    els.push(checkControl({
      label: 'Dither export (reduces banding)',
      checked: cfg.looks.ditherExport,
      onChange: function (v) { cfg.looks.ditherExport = v; onConfigChanged(); }
    }));

    return section('Export', els);
  }

  function buildPanel() {
    var scroll = $('#panel-scroll');
    scroll.innerHTML = '';
    refs = {};
    var cfg = activeConfig();
    if (!cfg) return;
    if (selectedLayerIndex < 0 || selectedLayerIndex >= cfg.layers.length) selectedLayerIndex = 0;
    var layer = cfg.layers[selectedLayerIndex];

    scroll.appendChild(buildResolutionSection(cfg));
    scroll.appendChild(buildLayersSection(cfg));
    scroll.appendChild(buildColorsSection(cfg, layer));
    scroll.appendChild(buildShapeSection(cfg, layer));
    scroll.appendChild(buildAnimSection(cfg));
    scroll.appendChild(buildLooksSection(cfg));
    scroll.appendChild(buildExportSection(cfg));
  }

  /* ================= Sets bar ================= */
  function renderSetsBar() {
    var row = $('#sets-row');
    row.innerHTML = '';
    state.sets.forEach(function (set) {
      var chip = el('div', 'chip' + (set.id === state.activeId ? ' active' : ''));
      chip.dataset.id = set.id;
      var thumb = el('img', 'chip-thumb');
      thumb.src = set.thumb || '';
      thumb.alt = '';
      var name = el('span', 'chip-name', set.name);
      var del = el('button', 'chip-del', '×');
      del.type = 'button';
      del.title = 'Delete';
      if (state.sets.length <= 1) del.classList.add('disabled');
      chip.append(thumb, name, del);
      chip.addEventListener('click', function () { selectSet(set.id); });
      del.addEventListener('click', function (e) { e.stopPropagation(); deleteSet(set.id); });
      chip.addEventListener('dblclick', function () { renameSet(set); });
      row.appendChild(chip);
    });

    var add = el('button', 'chip-add', '+');
    add.type = 'button';
    add.title = 'New wallpaper';
    add.addEventListener('click', addSet);
    row.appendChild(add);
  }

  function selectSet(id) {
    state.activeId = id;
    selectedLayerIndex = 0;
    buildPanel();
    renderSetsBar();
    renderPreview();
    saveState();
  }

  function addSet() {
    var cfg = randomConfig();
    cfg.thumb = renderThumb(cfg);
    state.sets.push(cfg);
    state.activeId = cfg.id;
    selectedLayerIndex = 0;
    buildPanel();
    renderSetsBar();
    renderPreview();
    saveState();
  }

  function deleteSet(id) {
    if (state.sets.length <= 1) return;
    var idx = state.sets.findIndex(function (s) { return s.id === id; });
    if (idx === -1) return;
    state.sets.splice(idx, 1);
    if (state.activeId === id) {
      var next = state.sets[Math.min(idx, state.sets.length - 1)];
      state.activeId = next.id;
      selectedLayerIndex = 0;
    }
    buildPanel();
    renderSetsBar();
    renderPreview();
    saveState();
  }

  function renameSet(set) {
    var chip = document.querySelector('.chip[data-id="' + set.id + '"]');
    if (!chip) return;
    var nameEl = chip.querySelector('.chip-name');
    if (!nameEl) return;
    var input = el('input', 'chip-rename');
    input.value = set.name;
    nameEl.replaceWith(input);
    input.focus();
    input.select();
    var done = false;
    function commit() {
      if (done) return;
      done = true;
      var v = input.value.trim();
      if (v) set.name = v;
      saveState();
      renderSetsBar();
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = set.name; input.blur(); }
    });
  }

  /* ================= Modal ================= */
  function openModal(title, body, onConfirm) {
    $('#modal-title').textContent = title;
    $('#modal-body').textContent = body;
    var modal = $('#confirm-modal');
    modal.classList.remove('hidden');
    $('#modal-cancel').onclick = function () { modal.classList.add('hidden'); };
    $('#modal-confirm').onclick = function () {
      modal.classList.add('hidden');
      onConfirm();
    };
  }

  function confirmRandomize() {
    openModal(
      'Randomize this wallpaper?',
      'This replaces the colors and all properties of the current set with new random values. Resolution stays unchanged.',
      randomizeActive
    );
  }

  function randomizeActive() {
    var cfg = activeConfig();
    if (!cfg) return;
    var fresh = randomConfig();
    cfg.layers = fresh.layers;
    cfg.anim = fresh.anim;
    cfg.looks = fresh.looks;
    selectedLayerIndex = 0;
    buildPanel();
    onConfigChanged();
  }

  /* ================= Panel toggle ================= */
  var panelOpen = false;
  function setPanelOpen(open) {
    panelOpen = open;
    $('#panel').classList.toggle('hidden', !open);
    $('#panel').setAttribute('aria-hidden', String(!open));
    $('#bottombar').classList.toggle('open', open);
  }

  /* ================= Export ================= */
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function imageMime() {
    var f = exportSettings.imageFormat;
    if (f === 'png') return 'image/png';
    if (f === 'jpeg') return 'image/jpeg';
    return 'image/webp';
  }

  function downloadImage() {
    var cfg = activeConfig();
    var res = effectiveResolution(cfg);
    var W = res.width, H = res.height;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    renderWallpaper(ctx, W, H, cfg, state.animTime);
    if (cfg.looks.ditherExport) applyOrderedDither(ctx, W, H);
    var mime = imageMime();
    var quality = exportSettings.imageFormat === 'png' ? undefined : exportSettings.quality;
    canvas.toBlob(function (blob) {
      if (!blob) { alert('Image export failed.'); return; }
      downloadBlob(blob, 'wallpaper-' + W + 'x' + H + '.' + exportSettings.imageFormat);
    }, mime, quality);
  }

  function pickVideoMime() {
    var preferred = exportSettings.videoFormat;
    var candidates;
    if (preferred === 'mp4') {
      candidates = [
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4;codecs=avc1.640028',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
    } else {
      candidates = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4'
      ];
    }
    for (var i = 0; i < candidates.length; i++) {
      if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
    }
    return '';
  }

  function videoBitrate(W, H, fps) {
    return clamp(Math.round(W * H * fps * 0.12), 1_000_000, 60_000_000);
  }

  function setRecordingUI(on) {
    $('#recording-overlay').classList.toggle('hidden', !on);
    $('#panel').classList.toggle('locked', on);
    $('#download-image').disabled = on;
    $('#download-video').disabled = on;
    $('#randomize').disabled = on;
  }

  function downloadVideo() {
    if (!window.MediaRecorder) {
      alert('Your browser does not support MediaRecorder, so video export is unavailable.');
      return;
    }
    if (recording) return;
    var cfg = activeConfig();
    var res = effectiveResolution(cfg);
    var W = res.width, H = res.height;
    var fps = exportSettings.fps;
    var duration = exportSettings.duration;

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');

    var stream = canvas.captureStream(fps);
    var mime = pickVideoMime();
    var ext = mime.indexOf('mp4') !== -1 ? 'mp4' : 'webm';
    var recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: videoBitrate(W, H, fps) });
    } catch (e) {
      try {
        recorder = new MediaRecorder(stream, { videoBitsPerSecond: videoBitrate(W, H, fps) });
      } catch (e2) {
        alert('Could not start video recording.');
        return;
      }
    }
    if (recorder.mimeType && recorder.mimeType.indexOf('mp4') !== -1) ext = 'mp4';

    var chunks = [];
    recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onstop = function () {
      var blob = new Blob(chunks, { type: mime.split(';')[0] || 'video/webm' });
      downloadBlob(blob, 'wallpaper-' + W + 'x' + H + '.' + ext);
      recording = false;
      setRecordingUI(false);
    };

    recording = true;
    setRecordingUI(true);
    var badge = $('#recording-badge');

    var videoTime = 0;
    var frames = 0;
    var start = performance.now();
    var lastVideoTs = start;

    function tick(now) {
      var dt = Math.min((now - lastVideoTs) / 1000, 0.1);
      lastVideoTs = now;
      if (cfg.anim.enabled) videoTime += dt * cfg.anim.masterSpeed;
      renderWallpaper(ctx, W, H, cfg, videoTime);
      frames++;
      badge.textContent = 'Recording… ' + Math.min(duration, (now - start) / 1000).toFixed(1) + 's / ' + duration + 's';
      if (now - start >= duration * 1000) {
        recorder.stop();
      } else {
        requestAnimationFrame(tick);
      }
    }

    recorder.start(250);
    requestAnimationFrame(tick);

    var expected = fps * duration;
    recorder.addEventListener('stop', function () {
      if (frames < expected * 0.9) {
        setTimeout(function () {
          alert('Some frames were dropped during recording (' + frames + '/' + expected + '). Try a lower frame rate or resolution.');
        }, 50);
      }
    });
  }

  /* ================= Init ================= */
  function init() {
    previewCanvas = $('#preview');
    previewCtx = previewCanvas.getContext('2d');

    var loaded = loadState();
    if (loaded) {
      state.sets = loaded.sets;
      state.activeId = loaded.activeId;
      state.sets.forEach(function (s) {
        if (!s.thumb) s.thumb = renderThumb(s);
      });
    } else {
      var first = randomConfig();
      first.thumb = renderThumb(first);
      state.sets = [first];
      state.activeId = first.id;
      saveState();
    }

    renderSetsBar();
    buildPanel();

    $('#properties-toggle').addEventListener('click', function () {
      setPanelOpen(!panelOpen);
    });

    $('#download-image').addEventListener('click', downloadImage);
    $('#download-video').addEventListener('click', downloadVideo);
    $('#randomize').addEventListener('click', confirmRandomize);

    window.addEventListener('resize', sizePreview);
    sizePreview();
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
