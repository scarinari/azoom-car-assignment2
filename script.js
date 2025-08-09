/* AZoom — Resilient front-end auth + hero banner (no backend)
   - Users: localStorage array
   - Session: sessionStorage
   - Register + Login + Logout
   - Booking guard with ?next=
   - Header UI only updates [data-auth] (safe for hero)
   - Hero banner cached + fallback; CSS fallback remains if JS fails
*/
(function () {
  const KEY_USERS   = 'az_users_arr';
  const KEY_SESSION = 'az_simple_session';
  const KEY_HERO    = 'az_hero_url';

  // ----- Users (localStorage) -----
  const loadUsers = () => { try { const x = JSON.parse(localStorage.getItem(KEY_USERS) || '[]'); return Array.isArray(x) ? x : []; } catch { return []; } };
  const saveUsers = arr => localStorage.setItem(KEY_USERS, JSON.stringify(arr || []));

  // ----- Session (sessionStorage) -----
  const currentUser = () => { try { return JSON.parse(sessionStorage.getItem(KEY_SESSION)); } catch { return null; } };
  const setSession  = u => { sessionStorage.setItem(KEY_SESSION, JSON.stringify({ email: u.email, name: u.name })); dispatchEvent(new Event('az:auth')); };
  const clearSession= () => { sessionStorage.removeItem(KEY_SESSION); dispatchEvent(new Event('az:auth')); };

  // ----- Auth core (plaintext for demo only) -----
  function registerUser(name, email, password) {
    const n=(name||'').trim(), e=(email||'').trim().toLowerCase(), p=(password||'').trim();
    if(!n||!e||!p) throw new Error('All fields are required.');
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Enter a valid email.');
    if(p.length<6) throw new Error('Password must be at least 6 characters.');
    const users=loadUsers();
    if(users.some(u=>u.email.toLowerCase()===e)) throw new Error('Email is already registered.');
    users.push({name:n,email:e,password:p}); saveUsers(users);
    return {name:n,email:e};
  }

  // >>> Improved messages here <<<
  function loginWith(email, password){
    const e=(email||'').trim().toLowerCase(), p=(password||'').trim();
    const users = loadUsers();
    const u = users.find(x => x.email.toLowerCase() === e);
    if (!u) throw new Error('This email is not registered. Please sign up first.');
    if (u.password !== p) throw new Error('Incorrect password. Please try again.');
    return { name: u.name, email: u.email };
  }

  // ----- Header UI (progressive enhancement) -----
  function renderAuthUI(){
    const box = document.querySelector('[data-auth]'); if(!box) return;
    const fallback = box.querySelector('#loginLink'); if(fallback) fallback.style.display='none';
    box.innerHTML = '';
    const u = currentUser();
    if(u){
      const who = document.createElement('span'); who.textContent = 'Hi, ' + (u.name || u.email); who.style.color='#cbd3d9';
      const reserve = document.createElement('button'); reserve.className='cta'; reserve.textContent='Reserve';
      reserve.onclick = () => location.href='booking.html';
      const logout = document.createElement('button'); logout.className='cta-outline'; logout.textContent='Logout';
      logout.onclick = () => { clearSession(); location.href='index.html'; };
      box.append(who, reserve, logout);
    } else {
      const loginBtn = document.createElement('button'); loginBtn.className='cta-outline'; loginBtn.textContent='Login';
      loginBtn.onclick = () => location.href='login.html';
      box.append(loginBtn);
    }
  }

  // ----- Booking guard -----
  function guardBooking(){
    if (/booking\.html$/i.test(location.pathname) && !currentUser()){
      const next = location.pathname + location.search;
      location.replace('login.html?next=' + encodeURIComponent(next));
    }
  }

  // ----- Booking submit (front-end demo) -----
  function luhnOk(num){
    const s=(num||'').replace(/\D/g,''); if(!s) return false;
    let sum=0, alt=false;
    for(let i=s.length-1;i>=0;i--){ let n=+s[i]; if(alt){ n*=2; if(n>9)n-=9; } sum+=n; alt=!alt; }
    return sum%10===0;
  }
  window.handleBooking = function(ev){
    ev.preventDefault();
    if(!currentUser()){ location.href='login.html?next='+encodeURIComponent('booking.html'); return false; }
    const car=document.getElementById('car')?.value;
    const duration=document.getElementById('duration')?.value;
    const branch=document.getElementById('branch')?.value;
    const email=document.getElementById('email')?.value;
    const cc=document.getElementById('creditCard')?.value;
    if(!luhnOk(cc)){ alert('Please enter a valid credit card number.'); return false; }
    const id='B'+Math.random().toString(36).slice(2,8).toUpperCase();
    const txt=document.getElementById('confirmText');
    if(txt) txt.textContent=`Reservation ${id} received for ${car} (${duration}) at ${branch}. Confirmation simulated for ${email}.`;
    document.getElementById('confirmModal')?.setAttribute('aria-hidden','false');
    return false;
  };
  window.closeConfirm = () => document.getElementById('confirmModal')?.setAttribute('aria-hidden','true');

  // ----- Forms -----
  function bindLoginForm(){
    const f=document.getElementById('loginForm'); if(!f) return;
    f.addEventListener('submit', e=>{
      e.preventDefault();
      const email=f.querySelector('[name="email"]')?.value||'';
      const pw=f.querySelector('[name="password"]')?.value||'';
      const msg=document.getElementById('loginMsg'); if(msg) msg.textContent='';
      try{
        const u=loginWith(email,pw); setSession(u);
        const rawNext = new URLSearchParams(location.search).get('next');
        location.href = rawNext && (rawNext.startsWith('/')||rawNext.startsWith('http')) ? rawNext : 'index.html';
      }catch(err){ if(msg) msg.textContent=err.message||'Login failed'; else alert(err.message||'Login failed'); }
    });
  }
  function bindRegisterForm(){
    const f=document.getElementById('registerForm'); if(!f) return;
    f.addEventListener('submit', e=>{
      e.preventDefault();
      const n=document.getElementById('r_name')?.value||'';
      const e1=document.getElementById('r_email')?.value||'';
      const p=document.getElementById('r_password')?.value||'';
      const c=document.getElementById('r_confirm')?.value||'';
      const msg=document.getElementById('registerMsg'); if(msg) msg.textContent='';
      try{
        if(p!==c) throw new Error('Passwords do not match.');
        const u=registerUser(n,e1,p); setSession(u); location.href='index.html';
      }catch(err){ if(msg) msg.textContent=err.message||'Registration failed'; else alert(err.message||'Registration failed'); }
    });
  }

  // ----- Hero banner: cache + fallback (JS-enhanced; CSS fallback still applied) -----
  function applyCachedHero(){
    const hero=document.getElementById('hero'); if(!hero) return;
    const cached=localStorage.getItem(KEY_HERO);
    if(cached){ hero.style.background = `url('${cached}') center/cover no-repeat, linear-gradient(180deg,#000,#161616)`; }
  }
  function initHeroFallback(){
    const hero=document.getElementById('hero'); if(!hero) return;
    const raw=hero.getAttribute('data-hero'); if(!raw) return;
    const list=raw.split(',').map(s=>s.trim()).filter(Boolean);
    let i=0;
    (function testNext(){
      if(i>=list.length) return;
      const url=list[i++], img=new Image();
      img.onload=()=>{ hero.style.background=`url('${url}') center/cover no-repeat, linear-gradient(180deg,#000,#161616)`; localStorage.setItem(KEY_HERO,url); };
      img.onerror=testNext;
      img.src = url + (url.includes('?')?'&':'?') + 'v=' + Date.now(); // bust cache
    })();
  }

  function boot(){
    applyCachedHero();
    renderAuthUI();
    bindLoginForm();
    bindRegisterForm();
    guardBooking();
    initHeroFallback();
  }

  document.addEventListener('DOMContentLoaded', boot);
  addEventListener('az:auth', renderAuthUI);
})();
