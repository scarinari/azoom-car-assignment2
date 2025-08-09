(function () {
  const KEY_USERS = 'az_users_arr';
  const KEY_SESSION = 'az_simple_session';
  const KEY_HERO = 'az_hero_url';

  // ▶ Base-path helpers for GitHub Pages (e.g. "/azoom-car-assignment2/")
  function getBasePath() {
    const seg = location.pathname.split('/').filter(Boolean);
    // If running under a repo path, seg[0] is the repo name
    return seg.length > 0 && seg[0] !== 'index.html' ? `/${seg[0]}/` : '/';
  }
  function buildUrl(file) { return getBasePath() + file.replace(/^\//, ''); }

  // --- user store/session helpers unchanged ---
  function loadUsers() { try { return JSON.parse(localStorage.getItem(KEY_USERS) || '[]') || []; } catch { return []; } }
  function saveUsers(arr) { localStorage.setItem(KEY_USERS, JSON.stringify(arr || [])); }
  function currentUser() { try { return JSON.parse(sessionStorage.getItem(KEY_SESSION)); } catch { return null; } }
  function setSession(user) { sessionStorage.setItem(KEY_SESSION, JSON.stringify({ email:user.email, name:user.name })); }
  function clearSession() { sessionStorage.removeItem(KEY_SESSION); }

  function registerUser(name,email,password){ /* … your same validation… */ }
  function loginWith(email,password){ /* … your same lookup… */ }

  // ▶ Header UI (use buildUrl)
  function ensureAuthBox(){ /* same as before */ }
  function renderAuthUI(){
    const box = ensureAuthBox(); if(!box) return;
    box.innerHTML = '';
    const u = currentUser();
    if(u){
      const who = document.createElement('span'); who.textContent = 'Hi, ' + (u.name || u.email); who.style.color = '#cbd3d9';
      const reserve = document.createElement('button'); reserve.className = 'cta'; reserve.textContent = 'Reserve';
      reserve.onclick = () => location.href = buildUrl('booking.html');
      const logout = document.createElement('button'); logout.className = 'cta-outline'; logout.textContent = 'Logout';
      logout.onclick = () => { clearSession(); location.href = buildUrl('index.html'); };
      box.append(who, reserve, logout);
    } else {
      const loginBtn = document.createElement('button'); loginBtn.className='cta-outline'; loginBtn.textContent='Login';
      loginBtn.onclick = () => location.href = buildUrl('login.html');
      box.append(loginBtn);
    }
  }

  // ▶ Booking guard (force /repo/login.html?next=/repo/booking.html)
  function guardBooking(){
    if (/booking\.html(?:$|\?)/.test(location.pathname) && !currentUser()){
      const nextPath = location.pathname + location.search;  // e.g. "/azoom-car-assignment2/booking.html"
      const url = buildUrl('login.html') + '?next=' + encodeURIComponent(nextPath);
      location.replace(url);
    }
  }

  // --- Booking submit unchanged (uses currentUser/luhn) ---

  // ▶ Forms: respect absolute next path or fallback to /repo/index.html
  function bindLoginForm(){
    const lf = document.getElementById('loginForm'); if(!lf) return;
    lf.addEventListener('submit',(e)=>{
      e.preventDefault();
      const email = lf.querySelector('[name="email"]')?.value || '';
      const pw    = lf.querySelector('[name="password"]')?.value || '';
      const msg   = document.getElementById('loginMsg'); if(msg) msg.textContent = '';
      try{
        const u = loginWith(email, pw);
        setSession(u);
        const rawNext = new URLSearchParams(location.search).get('next');
        if (rawNext && (rawNext.startsWith('/') || rawNext.startsWith('http'))) {
          location.href = rawNext;                // e.g. "/azoom-car-assignment2/booking.html"
        } else if (rawNext) {
          location.href = buildUrl(rawNext);      // treat as filename inside repo
        } else {
          location.href = buildUrl('index.html');
        }
      }catch(err){
        if(msg) msg.textContent = err.message || 'Login failed'; else alert(err.message || 'Login failed');
      }
    });
  }

  // --- register bind, hero cache, etc. remain as you had them ---

  function boot(){
    // applyCachedHero(); // if you use the hero cache
    renderAuthUI();
    bindLoginForm();
    // bindRegisterForm(); // if present
    guardBooking();
    // initHeroImageFallback(); // if used
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
