/* Frontend-only auth, header UI, booking guard, and robust hero banner handling */
(function () {
  const KEY_USERS = 'az_users';
  const KEY_SESSION = 'az_session';
  const KEY_HERO = 'az_hero_url';

  // -------- Tiny SHA-1 (demo hashing only) --------
  function rotl(n, s) { return (n << s) | (n >>> (32 - s)); }
  function sha1(str) {
    let H0 = 0x67452301, H1 = 0xEFCDAB89, H2 = 0x98BADCFE, H3 = 0x10325476, H4 = 0xC3D2E1F0;
    const ml = str.length * 8, words = [];
    for (let i = 0; i < str.length; i++) words[i >> 2] |= str.charCodeAt(i) << (24 - (i & 3) * 8);
    words[ml >> 5] |= 0x80 << (24 - ml % 32);
    words[((ml + 64 >> 9) << 4) + 15] = ml;
    for (let i = 0; i < words.length; i += 16) {
      const w = words.slice(i, i + 16);
      for (let j = 16; j < 80; j++) w[j] = rotl((w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]) >>> 0, 1) >>> 0;
      let a = H0, b = H1, c = H2, d = H3, e = H4;
      for (let j = 0; j < 80; j++) {
        const s = (j / 20) | 0;
        const f = [(b & c) | (~b & d), b ^ c ^ d, (b & c) | (b & d) | (c & d), b ^ c ^ d][s];
        const k = [0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xCA62C1D6][s];
        const t = ((rotl(a, 5) + f + e + k + w[j]) | 0) >>> 0;
        e = d; d = c; c = rotl(b, 30) >>> 0; b = a; a = t;
      }
      H0 = (H0 + a) | 0; H1 = (H1 + b) | 0; H2 = (H2 + c) | 0; H3 = (H3 + d) | 0; H4 = (H4 + e) | 0;
    }
    function tohex(i) { let h = ''; for (let s = 28; s >= 0; s -= 4) h += ((i >>> s) & 0xf).toString(16); return h; }
    return [H0, H1, H2, H3, H4].map(tohex).join('');
  }

  // -------- Storage helpers --------
  function safeParse(json, fallback) { try { return JSON.parse(json); } catch { return fallback; } }
  function loadUsers() { const raw = localStorage.getItem(KEY_USERS); const arr = safeParse(raw, []); return Array.isArray(arr) ? arr : []; }
  function saveUsers(list) { localStorage.setItem(KEY_USERS, JSON.stringify(list)); }
  function currentUser() { return safeParse(sessionStorage.getItem(KEY_SESSION), null); }
  function setSession(user) { sessionStorage.setItem(KEY_SESSION, JSON.stringify({ email: user.email, name: user.name || user.email, ts: Date.now() })); }
  function clearSession() { sessionStorage.removeItem(KEY_SESSION); }

  // -------- Auth core --------
  function login(email, password) {
    const e = (email || '').trim().toLowerCase();
    const p = (password || '');
    const users = loadUsers();
    const u = users.find(x => x.email === e && x.passwordHash === sha1(p));
    if (!u) throw new Error('Invalid email or password');
    setSession(u);
    return u;
  }
  function register(name, email, password) {
    const n = (name || '').trim();
    const e = (email || '').trim().toLowerCase();
    const p = (password || '');
    if (!n || !e || !p) throw new Error('All fields are required');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Enter a valid email');
    if (p.length < 6) throw new Error('Password must be at least 6 characters');
    const users = loadUsers();
    if (users.find(x => x.email === e)) throw new Error('Email already registered');
    users.push({ name: n, email: e, passwordHash: sha1(p) });
    saveUsers(users);
    return true;
  }

  // -------- Header UI (auth box only; never touch hero) --------
  function ensureAuthBox() {
    const header = document.querySelector('.header-inner') || document.querySelector('header .container');
    if (!header) return null;
    let box = header.querySelector('[data-auth]');
    if (!box) { box = document.createElement('div'); box.setAttribute('data-auth',''); header.appendChild(box); }
    box.style.display = 'flex'; box.style.gap = '8px'; box.style.alignItems = 'center';
    return box;
  }
  function renderAuthUI() {
    const u = currentUser();
    const box = ensureAuthBox();
    if (!box) return;
    box.innerHTML = '';
    if (u) {
      const who = document.createElement('span'); who.textContent = 'Hi, ' + (u.name || u.email); who.style.color = '#cbd3d9';
      const reserve = document.createElement('button'); reserve.className = 'cta'; reserve.textContent = 'Reserve'; reserve.onclick = () => location.href='booking.html';
      const logout = document.createElement('button'); logout.className = 'cta-outline'; logout.textContent = 'Logout'; logout.onclick = () => { clearSession(); location.reload(); };
      box.appendChild(who); box.appendChild(reserve); box.appendChild(logout);
    } else {
      const loginBtn = document.createElement('button'); loginBtn.className='cta-outline'; loginBtn.textContent='Login'; loginBtn.onclick=()=>location.href='login.html';
      box.appendChild(loginBtn);
    }
  }

  // -------- Booking protection --------
  function guardBooking() {
    if (/booking\.html(?:$|\?)/.test(location.pathname) && !currentUser()) {
      const nxt = location.pathname + location.search;
      location.replace('login.html?next=' + encodeURIComponent(nxt));
    }
  }

  // -------- Booking handler (if present) --------
  function luhnOk(num) {
    const s = (num || '').replace(/\D/g, ''); if (!s) return false;
    let sum = 0, alt = false;
    for (let i = s.length - 1; i >= 0; i--) { let n = +s[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
    return sum % 10 === 0;
  }
  window.handleBooking = function (e) {
    e.preventDefault();
    const u = currentUser();
    if (!u) { location.href = 'login.html?next=' + encodeURIComponent('booking.html'); return false; }
    const name = document.getElementById('name')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const car = document.getElementById('car')?.value;
    const duration = document.getElementById('duration')?.value;
    const branch = document.getElementById('branch')?.value;
    const cc = document.getElementById('creditCard')?.value;
    if (!luhnOk(cc)) { alert('Please enter a valid credit card number.'); return false; }
    const id = 'B' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const payload = { id, user: u.email, name, email, phone, car, duration, branch, ts: Date.now() };
    const all = safeParse(localStorage.getItem('az_bookings'), []); all.push(payload);
    localStorage.setItem('az_bookings', JSON.stringify(all));
    const txt = document.getElementById('confirmText'); if (txt) txt.textContent = `Reservation ${id} received for ${car} (${duration}), pick-up at ${branch}. A confirmation has been simulated for ${email}.`;
    const modal = document.getElementById('confirmModal'); if (modal) modal.setAttribute('aria-hidden', 'false');
    return false;
  };
  window.closeConfirm = function () { document.getElementById('confirmModal')?.setAttribute('aria-hidden', 'true'); };

  // -------- Forms auto-bind (optional) --------
  function bindFormsIfPresent() {
    const rf = document.getElementById('registerForm');
    if (rf) rf.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('r_name')?.value || '';
      const email = document.getElementById('r_email')?.value || '';
      const pw = document.getElementById('r_password')?.value || '';
      const cf = document.getElementById('r_confirm')?.value || '';
      const msg = document.getElementById('registerMsg');
      if (msg) msg.textContent = '';
      try { if (pw !== cf) throw new Error('Passwords do not match'); register(name, email, pw); login(email, pw); location.href = 'index.html'; }
      catch (err) { if (msg) msg.textContent = err.message || 'Registration failed'; else alert(err.message || 'Registration failed'); }
    });

    const lf = document.getElementById('loginForm');
    if (lf) lf.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = lf.querySelector('[name="email"]')?.value || '';
      const password = lf.querySelector('[name="password"]')?.value || '';
      const msg = document.getElementById('loginMsg'); if (msg) msg.textContent = '';
      try { login(email, password); const next = new URLSearchParams(location.search).get('next') || 'index.html'; location.href = next; }
      catch (err) { if (msg) msg.textContent = err.message || 'Login failed'; else alert(err.message || 'Login failed'); }
    });
  }

  // -------- HERO BANNER: cache & reapply so it never disappears --------
  function applyCachedHero() {
    const cached = localStorage.getItem(KEY_HERO);
    const hero = document.getElementById('hero');
    if (hero && cached) {
      hero.style.background = `url('${cached}') center/cover no-repeat`;
    }
  }
  function tryImagesSequentially(urls, onFound, onFail) {
    let i = 0;
    const testNext = () => {
      if (i >= urls.length) { onFail && onFail(); return; }
      const url = urls[i++];
      const img = new Image();
      img.onload = () => onFound(url);
      img.onerror = testNext;
      img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(); // bust cache
    };
    testNext();
  }
  function initHeroImageFallback() {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const raw = hero.getAttribute('data-hero');
    if (!raw) return;
    const candidates = raw.split(',').map(s => s.trim()).filter(Boolean);
    tryImagesSequentially(candidates, (ok) => {
      // set & cache
      hero.style.background = `url('${ok}') center/cover no-repeat`;
      localStorage.setItem(KEY_HERO, ok);
    });
  }

  // -------- Public API (optional) --------
  window.AZAuth = { login, register, currentUser, clearSession, renderAuthUI };

  // -------- Boot (run multiple times to survive navigation/login) --------
  function boot() {
    applyCachedHero();       // show banner immediately from cache (prevents flicker/disappear after login)
    renderAuthUI();          // draw header buttons
    bindFormsIfPresent();    // wire login/register if present
    guardBooking();          // protect booking page
    initHeroImageFallback(); // resolve banner if cache missing/changed
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', applyCachedHero);
  window.addEventListener('pageshow', applyCachedHero);
})();
