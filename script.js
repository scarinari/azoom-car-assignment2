/* AZoom – Simple array-based auth with registration (no backend)
   + Safe header rendering (only [data-auth])
   + Hero banner fallback + cache so it never disappears
   + Booking guard + confirmation modal
*/
(function () {
  const KEY_USERS = 'az_users_arr';
  const KEY_SESSION = 'az_simple_session';
  const KEY_HERO = 'az_hero_url';

  // ----- User store (array persisted in localStorage) -----
  function loadUsers() {
    try { const arr = JSON.parse(localStorage.getItem(KEY_USERS) || '[]'); return Array.isArray(arr) ? arr : []; }
    catch { return []; }
  }
  function saveUsers(arr) { localStorage.setItem(KEY_USERS, JSON.stringify(arr || [])); }

  // ----- Session -----
  function currentUser() { try { return JSON.parse(sessionStorage.getItem(KEY_SESSION)); } catch { return null; } }
  function setSession(user) { sessionStorage.setItem(KEY_SESSION, JSON.stringify({ email: user.email, name: user.name })); }
  function clearSession() { sessionStorage.removeItem(KEY_SESSION); }

  // ----- Auth core -----
  function registerUser(name, email, password) {
    const n = (name || '').trim();
    const e = (email || '').trim().toLowerCase();
    const p = (password || '').trim();
    if (!n || !e || !p) throw new Error('All fields are required.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Enter a valid email address.');
    if (p.length < 6) throw new Error('Password must be at least 6 characters.');

    const users = loadUsers();
    if (users.some(u => u.email.toLowerCase() === e)) throw new Error('Email is already registered.');
    users.push({ name: n, email: e, password: p }); // plain for demo only
    saveUsers(users);
    return { name: n, email: e };
  }
  function loginWith(email, password) {
    const e = (email || '').trim().toLowerCase();
    const p = (password || '').trim();
    const u = loadUsers().find(x => x.email.toLowerCase() === e && x.password === p);
    if (!u) throw new Error('Invalid email or password.');
    return { name: u.name, email: u.email };
  }

  // ----- Header UI (touch only [data-auth]) -----
  function ensureAuthBox() {
    const header = document.querySelector('.header-inner') || document.querySelector('header .container');
    if (!header) return null;
    let box = header.querySelector('[data-auth]');
    if (!box) { box = document.createElement('div'); box.setAttribute('data-auth', ''); header.appendChild(box); }
    Object.assign(box.style, { display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '8px' });
    return box;
  }
  function renderAuthUI() {
    const box = ensureAuthBox(); if (!box) return;
    box.innerHTML = '';
    const u = currentUser();
    if (u) {
      const who = document.createElement('span'); who.textContent = 'Hi, ' + (u.name || u.email); who.style.color = '#cbd3d9';
      const reserve = document.createElement('button'); reserve.className = 'cta'; reserve.textContent = 'Reserve'; reserve.onclick = () => location.href = 'booking.html';
      const logout = document.createElement('button'); logout.className = 'cta-outline'; logout.textContent = 'Logout'; logout.onclick = () => { clearSession(); location.reload(); };
      box.append(who, reserve, logout);
    } else {
      const loginBtn = document.createElement('button'); loginBtn.className = 'cta-outline'; loginBtn.textContent = 'Login'; loginBtn.onclick = () => location.href = 'login.html';
      box.append(loginBtn);
    }
  }

  // ----- Booking guard -----
  function guardBooking() {
    if (/booking\.html(?:$|\?)/.test(location.pathname) && !currentUser()) {
      const nxt = location.pathname + location.search;
      location.replace('login.html?next=' + encodeURIComponent(nxt));
    }
  }

  // ----- Booking submit (demo) -----
  function luhnOk(num) {
    const s = (num || '').replace(/\D/g, ''); if (!s) return false;
    let sum = 0, alt = false;
    for (let i = s.length - 1; i >= 0; i--) { let n = +s[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
    return sum % 10 === 0;
  }
  window.handleBooking = function (ev) {
    ev.preventDefault();
    if (!currentUser()) { location.href = 'login.html?next=' + encodeURIComponent('booking.html'); return false; }
    const car = document.getElementById('car')?.value;
    const duration = document.getElementById('duration')?.value;
    const branch = document.getElementById('branch')?.value;
    const email = document.getElementById('email')?.value;
    const cc = document.getElementById('creditCard')?.value;
    if (!luhnOk(cc)) { alert('Please enter a valid credit card number.'); return false; }
    const id = 'B' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const txt = document.getElementById('confirmText');
    if (txt) txt.textContent = `Reservation ${id} received for ${car} (${duration}) at ${branch}. Confirmation simulated for ${email}.`;
    document.getElementById('confirmModal')?.setAttribute('aria-hidden', 'false');
    return false;
  };
  window.closeConfirm = function () { document.getElementById('confirmModal')?.setAttribute('aria-hidden', 'true'); };

  // ----- Forms bind (if present) -----
  function bindLoginForm() {
    const lf = document.getElementById('loginForm'); if (!lf) return;
    lf.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = lf.querySelector('[name="email"]')?.value || '';
      const password = lf.querySelector('[name="password"]')?.value || '';
      const msg = document.getElementById('loginMsg'); if (msg) msg.textContent = '';
      try {
        const u = loginWith(email, password);
        setSession(u);
        const next = new URLSearchParams(location.search).get('next') || 'index.html';
        location.href = next;
      } catch (err) {
        if (msg) msg.textContent = err.message || 'Login failed'; else alert(err.message || 'Login failed');
      }
    });
  }
  function bindRegisterForm() {
    const rf = document.getElementById('registerForm'); if (!rf) return;
    rf.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('r_name')?.value || '';
      const email = document.getElementById('r_email')?.value || '';
      const pw = document.getElementById('r_password')?.value || '';
      const cf = document.getElementById('r_confirm')?.value || '';
      const msg = document.getElementById('registerMsg'); if (msg) msg.textContent = '';
      try {
        if (pw !== cf) throw new Error('Passwords do not match.');
        const u = registerUser(name, email, pw);
        setSession(u); // auto-login
        location.href = 'index.html';
      } catch (err) {
        if (msg) msg.textContent = err.message || 'Registration failed'; else alert(err.message || 'Registration failed');
      }
    });
  }

  // ===== HERO BANNER: fallback + cache so it persists across login/refresh =====
  function tryImagesSequentially(urls, onFound, onFail) {
    let i = 0;
    const testNext = () => {
      if (i >= urls.length) { onFail && onFail(); return; }
      const url = urls[i++];
      const img = new Image();
      img.onload = () => onFound(url);
      img.onerror = testNext;
      img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(); // cache-bust
    };
    testNext();
  }
  function applyCachedHero() {
    const hero = document.getElementById('hero'); if (!hero) return;
    const cached = localStorage.getItem(KEY_HERO);
    if (cached) hero.style.background = `url('${cached}') center/cover no-repeat`;
  }
  function initHeroImageFallback() {
    const hero = document.getElementById('hero'); if (!hero) return;
    const raw = hero.getAttribute('data-hero'); if (!raw) return;
    const candidates = raw.split(',').map(s => s.trim()).filter(Boolean);
    tryImagesSequentially(candidates, (ok) => {
      hero.style.background = `url('${ok}') center/cover no-repeat`;
      localStorage.setItem(KEY_HERO, ok);
    });
  }

  // ----- Public (optional) -----
  window.AZAuth = { currentUser, clearSession, registerUser, loginWith, renderAuthUI };

  // ----- Boot -----
  function boot() {
    applyCachedHero();        // show cached banner immediately
    renderAuthUI();           // only updates [data-auth]
    bindLoginForm();
    bindRegisterForm();
    guardBooking();
    initHeroImageFallback();  // resolve banner & cache it (in case cache was empty)
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', applyCachedHero);
  window.addEventListener('pageshow', applyCachedHero);
})();
