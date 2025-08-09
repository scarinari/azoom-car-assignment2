/* Frontend-only auth, header UI, and booking guard (GitHub Pages ready)
   - Logged OUT: right corner shows [Login]
   - Logged IN : right corner shows [Reserve] [Logout] + "Hi, name"
   - Booking is protected (redirects to login if needed)
   - Auto-wires #registerForm and #loginForm if present
*/
(function () {
  const KEY_USERS = 'az_users';
  const KEY_SESSION = 'az_session';

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

  function safeParse(json, fallback) { try { return JSON.parse(json); } catch { return fallback; } }
  function loadUsers() { const raw = localStorage.getItem(KEY_USERS); const arr = safeParse(raw, []); return Array.isArray(arr) ? arr : []; }
  function saveUsers(list) { localStorage.setItem(KEY_USERS, JSON.stringify(list)); }
  function currentUser() { return safeParse(sessionStorage.getItem(KEY_SESSION), null); }
  function setSession(user) { sessionStorage.setItem(KEY_SESSION, JSON.stringify({ email: user.email, name: user.name || user.email, ts: Date.now() })); }
  function clearSession() { sessionStorage.removeItem(KEY_SESSION); }

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

  function guardBooking() {
    if (/booking\.html(?:$|\?)/.test(location.pathname) && !currentUser()) {
      const nxt = location.pathname + location.search;
      location.replace('login.html?next=' + encodeURIComponent(nxt));
    }
  }

  
  // (Keep booking handler from previous builds if needed)

  function bindFormsIfPresent() {
    const rf = document.getElementById('registerForm');
    if (rf) {
      rf.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = (document.getElementById('r_name')||{}).value || '';
        const email = (document.getElementById('r_email')||{}).value || '';
        const pw = (document.getElementById('r_password')||{}).value || '';
        const cf = (document.getElementById('r_confirm')||{}).value || '';
        const msg = document.getElementById('registerMsg');
        if (msg) msg.textContent = '';
        try {
          if (pw !== cf) throw new Error('Passwords do not match');
          register(name, email, pw);
          login(email, pw);
          location.href = 'index.html';
        } catch (err) {
          if (msg) msg.textContent = err.message || 'Registration failed';
          else alert(err.message || 'Registration failed');
        }
      });
    }

    const lf = document.getElementById('loginForm');
    if (lf) {
      lf.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = (lf.querySelector('[name="email"]')||{}).value || '';
        const password = (lf.querySelector('[name="password"]')||{}).value || '';
        const msg = document.getElementById('loginMsg'); if (msg) msg.textContent = '';
        try {
          login(email, password);
          const next = new URLSearchParams(location.search).get('next') || 'index.html';
          location.href = next;
        } catch (err) {
          if (msg) msg.textContent = err.message || 'Login failed';
          else alert(err.message || 'Login failed');
        }
      });
    }
  }

  window.AZAuth = { login, register, currentUser, clearSession, renderAuthUI };

  document.addEventListener('DOMContentLoaded', () => {
    renderAuthUI();
    bindFormsIfPresent();
    guardBooking();
  });
})();