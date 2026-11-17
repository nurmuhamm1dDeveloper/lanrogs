import { Store } from './store';

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

export function dayKey(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// call inside Store.commit to count today as a study day
export function bump(s) { const k = dayKey(); s.activity[k] = (s.activity[k] || 0) + 1; }

export function streak() {
  const act = Store.get().activity || {};
  const d = new Date();
  let n = 0;
  if (!act[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (act[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// Only accept colours and pictures in the exact format we create ourselves.
export function color(c) { return /^#[0-9a-f]{6}$/i.test(c || '') ? c : ''; }
export function imgOK(s) { return typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s); }

// Resize a picture before saving, so cloud and browser storage stay small.
// square = crop to the centre square (profile pictures); quality 0..1
export function fileToDataURL(file, max, square, quality) {
  max = max || 420;
  return new Promise(function (res, rej) {
    const r = new FileReader();
    r.onerror = function () { rej(new Error('Could not read that file')); };
    r.onload = function () {
      const img = new Image();
      img.onerror = function () { rej(new Error('That is not a valid picture')); };
      img.onload = function () {
        let sw = img.width, sh = img.height, sx = 0, sy = 0;
        if (square) { const m = Math.min(sw, sh); sx = Math.round((sw - m) / 2); sy = Math.round((sh - m) / 2); sw = sh = m; }
        const k = Math.min(1, max / Math.max(sw, sh));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', quality || 0.78));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
