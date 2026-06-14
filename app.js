/* ============================================================
   WERONIKA — PIXEL PORTFOLIO  ·  app.js
   Handles ONLY: loading, particles, sound, windows,
   achievements, XP, navigation, interactions.
   ALL content lives in content.json
   ============================================================ */

(() => {
  'use strict';

  /* ---------- global state ---------- */
  const state = {
    data: null,
    sound: true,
    unlocked: new Set(),
    visited: new Set(),
    xp: 0,
    konami: [],
    zTop: 110,
    level: 0,
    booted: false,
  };
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, html) => { const n=document.createElement(tag); if(cls)n.className=cls; if(html!=null)n.innerHTML=html; return n; };
  const esc = (s='') => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ============================================================
     PIXEL ICONS  (7x7 grids — squares only)
     ============================================================ */
  const ICONS = {
    vault:  ['0111110','1000001','1011101','1010101','1011101','1000001','0111110'],
    forge:  ['1111111','0011100','0011100','0011100','0111110','1111111','0000000'],
    lab:    ['0011000','0011000','0111100','0100100','1000010','1011010','0111100'],
    arcade: ['0111110','1111111','1010101','1111111','1010101','0111110','0010100'],
    cards:  ['1111110','1000010','1011010','1000010','0100001','0101101','0111110'],
    about:  ['0011100','0100010','0100010','0011100','0111110','1111111','1011101'],
  };
  function iconSVG(name, color){
    const grid = ICONS[name] || ICONS.about;
    let rects = '';
    grid.forEach((row,y)=>{ [...row].forEach((c,x)=>{ if(c==='1') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }); });
    return `<svg class="menu-ico" viewBox="0 0 7 7" fill="${color}" shape-rendering="crispEdges">${rects}</svg>`;
  }

  /* ============================================================
     PLAYER AVATAR  (pixel self-portrait — ginger wavy hair,
     green eyes, pale freckled skin, gold earrings)
     ============================================================ */
  const AVA_COLORS = {
    o:'#b34a18', H:'#df6a2c', h:'#ff9e54',   // hair outline / mid / highlight
    S:'#ffe7d4', k:'#f0c4a0', f:'#e0935f',   // skin / shadow / freckle
    b:'#bf531f',                              // brow
    w:'#ffffff', G:'#46b35f', p:'#173a20',   // eye white / green iris / pupil
    n:'#ecae87', m:'#cd6a62',                 // nose / mouth
    g:'#ffd24a', d:'#d9a521',                 // gold earring / shadow
    C:'#ff3ea5', c:'#cf2c81',                 // top / top shadow
  };
  const AVA_ART = [
    '......HHHHHH......',
    '....HHhHHHHhHH....',
    '...HHHHHHHHHHHH...',
    '..HHHhHHHHHHhHHH..',
    '..HHHHHSSSSSSHHHH.',
    '.HHHHSSSSSSSSHHHHH',
    '.HHHSSSSSSSSSSHHHH',
    '.HHHSSbbSSSSbbSSHH',
    '.HHHSSwGSSSSwGSSHH',
    '.HHHSSwpSSSSwpSSHH',
    '.HHHHSSSSnnSSSSHHH',
    '.HHHSfSSSSSSSSfSHH',
    '.HHHSSSSmmmmSSSSHH',
    '.HHHHSSSmmmmSSSHHH',
    '..HHHHSSSSSSSSHHHH',
    '..gHHHSSSSSSSSHHHg',
    '..dgHHHkkkkkkHHHgd',
    '...HHHHkkkkkkHHHH.',
    '....CCCCCCCCCC....',
    '..CCCCCCCCCCCCCC..',
    '.CCcCCCCCCCCCCcCC.',
  ];
  function avatarSVG(){
    const W = 18, H = AVA_ART.length;
    let rects = '';
    AVA_ART.forEach((row,y)=>{
      const padded = (row + '.'.repeat(W)).slice(0, W);
      [...padded].forEach((ch,x)=>{
        const col = AVA_COLORS[ch];
        if(col) rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${col}"/>`;
      });
    });
    return `<svg class="ava-svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" preserveAspectRatio="xMidYMax meet">${rects}</svg>`;
  }

  /* ============================================================
     SOUND  (WebAudio — synthesized retro blips, no asset files)
     ============================================================ */
  let actx = null;
  function ensureCtx(){ if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)(); return actx; }
  function beep(freq=440, dur=0.08, type='square', vol=0.06){
    if(!state.sound) return;
    try{
      const ctx = ensureCtx();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
      o.start(t); o.stop(t+dur);
    }catch(e){}
  }
  const sfx = {
    hover:   () => beep(660, .04, 'square', .03),
    select:  () => { beep(523,.06); setTimeout(()=>beep(784,.08),60); },
    back:    () => beep(330, .07, 'triangle', .05),
    open:    () => beep(880, .05, 'square', .04),
    close:   () => beep(220, .06, 'sawtooth', .04),
    copy:    () => { beep(988,.05); setTimeout(()=>beep(1319,.06),50); },
    achieve: () => { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.1,'square',.05), i*70)); },
    type:    () => beep(440+Math.random()*220, .02, 'square', .02),
    error:   () => { beep(200,.12,'sawtooth',.06); setTimeout(()=>beep(150,.16,'sawtooth',.06),120); },
    secret:  () => { [659,784,988,1319,1568].forEach((f,i)=>setTimeout(()=>beep(f,.12,'square',.06), i*90)); },
    start:   () => { [392,523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.1,'square',.06), i*80)); },
  };

  /* ============================================================
     PARTICLES (canvas starfield + drifting pixels)
     ============================================================ */
  function initParticles(){
    const cv = $('#particles'), ctx = cv.getContext('2d');
    let w, h, parts = [];
    const COLORS = ['#ff3ea5','#39ff14','#2de2e6','#b14bff','#ffe34d','#ff66c4'];
    function resize(){ w = cv.width = innerWidth; h = cv.height = innerHeight; build(); }
    function build(){
      const n = Math.round((w*h)/22000);
      parts = Array.from({length:n}, () => ({
        x: Math.random()*w, y: Math.random()*h,
        s: 1 + Math.floor(Math.random()*3),
        vy: .15 + Math.random()*.55,
        vx: (Math.random()-.5)*.25,
        c: COLORS[(Math.random()*COLORS.length)|0],
        tw: Math.random()*Math.PI*2,
      }));
    }
    function frame(){
      ctx.clearRect(0,0,w,h);
      for(const p of parts){
        p.y += p.vy; p.x += p.vx; p.tw += .05;
        if(p.y > h+4){ p.y = -4; p.x = Math.random()*w; }
        const a = .35 + Math.abs(Math.sin(p.tw))*.55;
        ctx.globalAlpha = a; ctx.fillStyle = p.c;
        ctx.fillRect(p.x|0, p.y|0, p.s, p.s);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    addEventListener('resize', resize);
    resize(); frame();
  }

  /* ============================================================
     BOOT LOADER
     ============================================================ */
  function runBoot(){
    const fill = $('#loadFill'), pct = $('#loadPct'), tip = $('#bootTip');
    const tips = ['loading assets...','spawning pixels...','tuning palettes...','warming up the forge...','press start when ready'];
    let p = 0;
    const iv = setInterval(()=>{
      p += 4 + Math.random()*11; if(p>100) p=100;
      fill.style.width = p+'%'; pct.textContent = Math.floor(p)+'%';
      tip.textContent = tips[Math.min(tips.length-1, Math.floor(p/22))];
      if(p>=100){
        clearInterval(iv);
        setTimeout(()=>{ $('#boot').classList.add('fade'); setTimeout(()=>$('#boot').classList.add('hidden'),520); }, 380);
      }
    }, 130);
  }

  /* ============================================================
     XP + ACHIEVEMENTS + HUD
     ============================================================ */
  function syncHud(){
    const d = state.data.player;
    const totalAch = state.data.achievements.length;
    const got = state.unlocked.size;
    const baseXp = d.xp;
    const pctXp = Math.min(100, baseXp + got*5 + state.xp);
    $('#xpFill').style.width = pctXp + '%';
    const lvl = d.level + Math.floor((got*5+state.xp)/40);
    $('#hudLvl').textContent = 'LV ' + lvl;
    $('#hudClass').textContent = d.class;
    $('#achCount').textContent = got;
    // level-up celebration (skip the very first sync on load)
    if(state.booted && lvl > state.level){ levelUpFx(lvl); }
    state.level = lvl;
  }

  /* ---------- LEVEL-UP SPARKLE / FIREWORK ---------- */
  function levelUpFx(lvl){
    sfx.achieve();
    const banner = el('div','levelup', `<span class="lu-star">✦</span>LEVEL UP!<span class="lu-lvl">LV ${lvl}</span><span class="lu-star">✦</span>`);
    document.body.appendChild(banner);
    setTimeout(()=>banner.remove(), 1700);
    // pixel firework burst from the XP bar
    const xp = $('#xpFill').getBoundingClientRect();
    const ox = xp.right - 6, oy = xp.top + xp.height/2;
    const cols = ['#ffe34d','#ff3ea5','#39ff14','#2de2e6','#b14bff','#ff66c4'];
    const N = 28;
    for(let i=0;i<N;i++){
      const s = el('div','spark');
      const ang = (Math.PI*2*i)/N + Math.random()*0.3;
      const dist = 60 + Math.random()*90;
      s.style.left = ox+'px'; s.style.top = oy+'px';
      s.style.background = cols[i%cols.length];
      const sz = 4 + Math.floor(Math.random()*4);
      s.style.width = s.style.height = sz+'px';
      s.style.setProperty('--dx', Math.cos(ang)*dist+'px');
      s.style.setProperty('--dy', Math.sin(ang)*dist+'px');
      document.body.appendChild(s);
      setTimeout(()=>s.remove(), 900);
    }
  }
  function buildHearts(){
    const wrap = $('#hearts'); wrap.innerHTML='';
    for(let i=0;i<3;i++) wrap.appendChild(el('div','heart'));
  }
  function unlock(id){
    if(state.unlocked.has(id)) return;
    const a = state.data.achievements.find(x=>x.id===id);
    if(!a) return;
    state.unlocked.add(id);
    state.xp += 5;
    sfx.achieve();
    toast(a.name, a.desc);
    syncHud(); renderAchList();
  }
  function toast(title, desc){
    const t = el('div','toast', `<div class="toast-star">★</div><div class="toast-txt"><b>ACHIEVEMENT</b><span>${esc(title)} — ${esc(desc)}</span></div>`);
    $('#toastLayer').appendChild(t);
    setTimeout(()=>t.remove(), 4000);
  }
  function renderAchList(){
    const list = $('#achList'); list.innerHTML='';
    state.data.achievements.forEach(a=>{
      const got = state.unlocked.has(a.id);
      const item = el('div', 'ach-item' + (got?'':' locked'),
        `<div class="ach-badge ${got?'got':''}">${got?'★':'?'}</div>
         <div class="ach-info"><b>${esc(a.name)}</b><span>${got?esc(a.desc):'LOCKED'}</span></div>`);
      list.appendChild(item);
    });
  }

  /* ============================================================
     NAVIGATION + TRANSITIONS
     ============================================================ */
  const SECTION_IDS = ['logos','fonts','brand','social','cards','about'];
  function show(id){
    const wipe = $('#transition');
    wipe.classList.remove('wipe'); void wipe.offsetWidth; wipe.classList.add('wipe');
    setTimeout(()=>{
      $$('.screen').forEach(s=>s.classList.remove('active'));
      $('#screen-'+id).classList.add('active');
      $('#hud').classList.toggle('hidden', id==='landing');
      window.scrollTo(0,0);
      if(SECTION_IDS.includes(id)){
        if(!state.visited.has(id)){ state.visited.add(id); unlock(id); }
      }
    }, 180);
  }
  function goSection(id){ sfx.select(); show(id); }
  function goHub(){ sfx.back(); show('hub'); }

  /* ============================================================
     DRAGGABLE WINDOWS
     ============================================================ */
  let draggedOnce = false;
  function makeWindow({title, bodyHTML, x, y, w, cls=''}){
    const layer = $('#windowLayer');
    const win = el('div','win '+cls);
    win.style.left = (x ?? (innerWidth/2 - 160 + (Math.random()*60-30))) + 'px';
    win.style.top  = (y ?? (innerHeight/2 - 120 + (Math.random()*60-30))) + 'px';
    if(w) win.style.width = w+'px';
    win.style.zIndex = ++state.zTop;
    win.innerHTML = `
      <div class="win-bar">
        <span class="win-title">▣ ${esc(title)}</span>
        <span class="win-ctrls"><button class="x-btn" data-min>_</button><button class="x-btn" data-close>×</button></span>
      </div>
      <div class="win-body">${bodyHTML}</div>`;
    layer.appendChild(win);
    sfx.open();

    win.addEventListener('mousedown', ()=>{ win.style.zIndex = ++state.zTop; });
    win.querySelector('[data-close]').addEventListener('click', e=>{ e.stopPropagation(); sfx.close(); win.style.animation='winPop .15s reverse'; setTimeout(()=>win.remove(),140); });
    win.querySelector('[data-min]').addEventListener('click', e=>{ e.stopPropagation(); const b=win.querySelector('.win-body'); b.classList.toggle('hidden'); beep(300,.05); });

    // drag (mouse + touch)
    const bar = win.querySelector('.win-bar');
    let sx,sy,ox,oy,drag=false;
    const start = (px,py)=>{ drag=true; sx=px; sy=py; const r=win.getBoundingClientRect(); ox=r.left; oy=r.top; win.style.zIndex=++state.zTop; };
    const move = (px,py)=>{ if(!drag) return; let nx=ox+(px-sx), ny=oy+(py-sy);
      nx=Math.max(-40,Math.min(innerWidth-60,nx)); ny=Math.max(0,Math.min(innerHeight-40,ny));
      win.style.left=nx+'px'; win.style.top=ny+'px';
      if(!draggedOnce){ draggedOnce=true; unlock('drag_window'); } };
    const end = ()=>{ drag=false; };
    bar.addEventListener('mousedown', e=>{ if(e.target.closest('.x-btn'))return; e.preventDefault(); start(e.clientX,e.clientY); });
    addEventListener('mousemove', e=>move(e.clientX,e.clientY));
    addEventListener('mouseup', end);
    bar.addEventListener('touchstart', e=>{ if(e.target.closest('.x-btn'))return; const t=e.touches[0]; start(t.clientX,t.clientY); }, {passive:true});
    addEventListener('touchmove', e=>{ if(drag){ const t=e.touches[0]; move(t.clientX,t.clientY); } }, {passive:true});
    addEventListener('touchend', end);
    return win;
  }
  function phTile(label, color){
    return `<div class="ph" style="--c:${color}"><span class="ph-lbl">${esc(label)}</span></div>`;
  }

  /* ============================================================
     RENDER: LANDING + HUB
     ============================================================ */
  function renderLanding(){
    const p = state.data.player;
    $('#lYear').textContent = p.title2026.split(' ')[0] || '2026';
    $('#lName').textContent = p.name;
    $('#lTag').textContent = p.tagline;
    $('#lHint').textContent = p.startHint;
    const strip = Array(8).fill(`${p.name} ★ PORTFOLIO ★ `).join('');
    $('#marqueeTop').innerHTML = `<span>${esc(strip)}</span>`;
    $('#marqueeBot').innerHTML = `<span>${esc(Array(8).fill('SELECT · START · INSERT COIN · ').join(''))}</span>`;
  }
  function renderHub(){
    const d = state.data;
    $('#hudClass').textContent = d.player.class;
    $('#hudLvl').textContent = 'LV ' + d.player.level;
    $('#hubName').textContent = d.player.name;
    $('#hubTag').textContent = d.player.tagline;
    const grid = $('#menuGrid'); grid.innerHTML='';
    const colors=['#ff3ea5','#39ff14','#2de2e6','#b14bff','#ffe34d','#ff66c4'];
    d.menu.forEach((m,i)=>{
      const card = el('button','menu-card');
      card.innerHTML = `
        <span class="menu-tag">QUEST ${esc(m.tag)}</span>
        ${iconSVG(m.icon, colors[i%colors.length])}
        <span class="menu-label">${esc(m.label)}</span>
        <span class="menu-sub">${esc(m.sub)}</span>
        <span class="menu-arrow">▶</span>`;
      card.addEventListener('mouseenter', sfx.hover);
      card.addEventListener('click', ()=>goSection(m.id));
      grid.appendChild(card);
    });
    const c = d.contact;
    $('#hubFoot').innerHTML =
      `<button class="contact-open" id="contactOpen">✉ CONTACT / SEND MESSAGE</button>
       <div class="hub-foot-links">${esc(c.instagram)} · <b style="color:var(--yellow)">${esc(c.availability)}</b></div>`;
    const co = $('#contactOpen');
    co.addEventListener('mouseenter', sfx.hover);
    co.addEventListener('click', openContactWindow);
  }

  /* ---------- CONTACT FORM (floating window, mailto compose) ---------- */
  function openContactWindow(){
    if($('.contact-win')){ return; }
    const c = state.data.contact;
    const win = makeWindow({ title:'CONTACT.exe', w:380, cls:'contact-win', bodyHTML:`
      <form class="cform" autocomplete="off">
        <label class="cf-label">NAME</label>
        <input class="cf-input" name="name" maxlength="60" placeholder="Player name" required />
        <label class="cf-label">YOUR EMAIL</label>
        <input class="cf-input" name="email" type="email" maxlength="80" placeholder="you@email.com" required />
        <label class="cf-label">MESSAGE</label>
        <textarea class="cf-input cf-area" name="msg" maxlength="600" rows="4" placeholder="Tell me about your quest..." required></textarea>
        <button type="submit" class="cf-send">▶ SEND MESSAGE</button>
        <div class="cf-alt">or email direct: <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>
      </form>`});
    const form = win.querySelector('.cform');
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const fd = new FormData(form);
      const name = (fd.get('name')||'').toString().trim();
      const email = (fd.get('email')||'').toString().trim();
      const msg = (fd.get('msg')||'').toString().trim();
      if(!name || !email || !msg){ return; }
      const subject = encodeURIComponent(`New quest from ${name}`);
      const body = encodeURIComponent(`${msg}\n\n— ${name}\n${email}`);
      window.location.href = `mailto:${c.email}?subject=${subject}&body=${body}`;
      toast('MESSAGE SENT', 'Opening your mail client...');
      sfx.achieve();
      form.innerHTML = `<div class="cf-thanks">✦ THANKS, ${esc(name.toUpperCase())}! ✦<br><span>Your mail app should be opening with the message ready to send.</span></div>`;
    });
    win.querySelectorAll('.cf-input').forEach(i=> i.addEventListener('input', ()=>beep(520+Math.random()*200,.02,'square',.02)));
  }

  /* ============================================================
     RENDER: SECTION SHELL HELPER
     ============================================================ */
  function sectionShell(id, tag, title, desc, innerHTML){
    $('#screen-'+id).innerHTML = `
      <div class="sec-wrap">
        <div class="sec-head">
          <button class="sec-back">◀ BACK TO HUB</button>
          <div class="sec-tag">QUEST ${esc(tag)}</div>
          <h2 class="sec-title">${esc(title)}</h2>
          <p class="sec-desc">${esc(desc)}</p>
        </div>
        ${innerHTML}
      </div>`;
    const back = $('#screen-'+id+' .sec-back');
    back.addEventListener('click', goHub);
    back.addEventListener('mouseenter', sfx.hover);
  }

  /* ---------- LOGO VAULT ---------- */
  function logoImages(l){
    if(l.variants && l.variants.length) return l.variants;
    if(l.image) return [l.image];
    return [];
  }
  function logoTileArt(l){
    const imgs = logoImages(l);
    if(imgs.length) return `<img class="vault-img" src="${esc(imgs[0])}" alt="${esc(l.name)}" loading="lazy" />`
      + (imgs.length>1 ? `<span class="vault-badge">×${imgs.length}</span>` : '');
    return phTile('LOGO IMG', l.swatch);
  }
  function renderLogos(){
    const items = state.data.logos.map(l=>{
      const multi = logoImages(l).length>1;
      return `
      <div class="vault-cell" data-id="${esc(l.id)}">
        <div class="vault-art" style="--c:${l.swatch}">${logoTileArt(l)}</div>
        <div class="vault-name">${esc(l.name)}</div>
        <div class="vault-meta"><span>${esc(l.year)}</span><span>${esc(l.tags.join(' / '))}</span></div>
        <div class="vault-open">▣ ${multi ? 'SCROLL '+logoImages(l).length+' VERSIONS' : 'CLICK TO OPEN'}</div>
      </div>`;
    }).join('');
    sectionShell('logos','01','LOGO VAULT','Identity marks & wordmarks. Click any item to pop it open in a draggable window — multi-version logos scroll like cards.',
      `<div class="vault-grid">${items}</div>`);
    $$('#screen-logos .vault-cell').forEach(c=>{
      c.addEventListener('mouseenter', sfx.hover);
      c.addEventListener('click', ()=>{
        const l = state.data.logos.find(x=>x.id===c.dataset.id);
        openLogoWindow(l);
      });
    });
  }

  function openLogoWindow(l){
    const imgs = logoImages(l);
    const meta = `
      <div class="win-row"><b>YEAR</b><span>${esc(l.year)}</span></div>
      <div class="win-tags">${l.tags.map(t=>`<span class="win-tag">${esc(t)}</span>`).join('')}</div>
      <p class="win-note">${esc(l.note)}</p>`;

    if(imgs.length <= 1){
      const art = imgs.length ? `<img class="logo-img-full" src="${esc(imgs[0])}" alt="${esc(l.name)}" />` : phTile('LOGO PREVIEW', l.swatch);
      makeWindow({ title: l.name, w: imgs.length?360:undefined, bodyHTML: art + meta });
      return;
    }

    // multi-version → scrollable viewer (same pattern as business cards)
    const n = imgs.length;
    const slides = imgs.map((src,i)=>`<figure class="cardview-slide"><div class="cardview-frame logo-frame">${`<img class="logo-img-full" src="${esc(src)}" alt="${esc(l.name)} v${i+1}" />`}</div><figcaption>VERSION ${i+1}</figcaption></figure>`).join('');
    const dots = imgs.map((_,i)=>`<span class="cv-dot ${i===0?'is-on':''}" data-dot="${i}"></span>`).join('');
    const win = makeWindow({ title: l.name, w: 380, cls:'card-win', bodyHTML: `
      <div class="cardview">
        <div class="cardview-track" data-track>${slides}</div>
        <div class="cardview-nav">
          <button class="cv-btn" data-prev>◀ PREV</button>
          <div class="cardview-dots">${dots}</div>
          <button class="cv-btn" data-next>NEXT ▶</button>
        </div>
      </div>${meta}` });

    const track = win.querySelector('[data-track]');
    const dotEls = [...win.querySelectorAll('.cv-dot')];
    let cur = 0;
    const goTo = (i)=>{ cur=Math.max(0,Math.min(n-1,i)); track.scrollTo({left: cur*track.clientWidth, behavior:'smooth'}); };
    win.querySelector('[data-prev]').addEventListener('click', e=>{ e.stopPropagation(); goTo(cur-1); sfx.select(); });
    win.querySelector('[data-next]').addEventListener('click', e=>{ e.stopPropagation(); goTo(cur+1); sfx.select(); });
    dotEls.forEach((d,i)=> d.addEventListener('click', e=>{ e.stopPropagation(); goTo(i); beep(660,.04); }));
    track.addEventListener('scroll', ()=>{
      const idx = Math.round(track.scrollLeft / Math.max(1,track.clientWidth));
      cur = idx; dotEls.forEach((d,i)=> d.classList.toggle('is-on', i===idx));
    }, {passive:true});
  }

  /* ---------- FONT FORGE ---------- */
  let typedOnce = false;
  function renderFonts(){
    const cards = state.data.fonts.map(f=>`
      <div class="forge-card">
        <div class="forge-meta"><span class="forge-fname">${esc(f.name)}</span><span class="forge-fstyle">${esc(f.style)}</span></div>
        <div class="forge-blurb">${esc(f.blurb)}</div>
        <div class="forge-sample" data-css="${esc(f.css)}" style="font-family:${f.css}">${esc(f.sample)}</div>
      </div>`).join('');
    sectionShell('fonts','02','FONT FORGE','Custom type specimens. Type your own text below and watch every face update live.',
      `<input class="forge-input" id="forgeInput" maxlength="60" value="Type something..." />
       <div class="forge-tools">
         <label>SIZE <input class="forge-slider" id="forgeSize" type="range" min="18" max="72" value="34"></label>
         <span id="forgeSizeVal" style="font-family:var(--font-pixel);font-size:11px;color:var(--green)">34px</span>
       </div>
       <div class="forge-list">${cards}</div>`);
    const input = $('#forgeInput'), size = $('#forgeSize'), sizeVal = $('#forgeSizeVal');
    const samples = $$('#screen-fonts .forge-sample');
    const apply = ()=>{ const txt = input.value || ' '; samples.forEach(s=>{ s.textContent = txt; s.style.fontSize = size.value+'px'; }); };
    input.addEventListener('focus', ()=>{ if(input.value==='Type something...') input.value=''; });
    input.addEventListener('input', ()=>{ apply(); sfx.type(); if(!typedOnce){ typedOnce=true; unlock('type_forge'); } });
    size.addEventListener('input', ()=>{ apply(); sizeVal.textContent = size.value+'px'; });
    apply();
  }

  /* ---------- BRAND LAB ---------- */
  function renderBrand(){
    const cards = state.data.branding.map(b=>`
      <div class="lab-card">
        <div class="lab-head"><span class="lab-name">${esc(b.name)}</span><span class="lab-vibe">${esc(b.vibe)}</span></div>
        <div class="lab-swatches">
          ${b.colors.map(c=>`<button class="swatch" data-hex="${esc(c)}" style="background:${c}"><span class="hex">${esc(c)}</span></button>`).join('')}
        </div>
      </div>`).join('');
    sectionShell('brand','03','BRAND LAB','Curated palettes & color systems. Click any swatch to copy its hex code to your clipboard.',
      `<div class="lab-grid">${cards}</div>`);
    $$('#screen-brand .swatch').forEach(s=>{
      s.addEventListener('mouseenter', sfx.hover);
      s.addEventListener('click', ()=>{
        const hex = s.dataset.hex;
        const done = ()=>{ s.classList.add('copied'); sfx.copy(); unlock('copy_color'); setTimeout(()=>s.classList.remove('copied'),1100); };
        if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(hex).then(done).catch(done); }
        else { const ta=el('textarea'); ta.value=hex; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(e){} ta.remove(); done(); }
      });
    });
  }

  /* ---------- SOCIAL ARCADE ---------- */
  function socialArt(s, label){
    if(s.image) return `<img class="arcade-img" src="${esc(s.image)}" alt="${esc(s.title)}" loading="lazy" />`;
    return phTile(label, s.swatch);
  }
  function renderSocial(){
    const items = state.data.social.map(s=>`
      <div class="arcade-cell" data-id="${esc(s.id)}">
        <div class="arcade-corner">${esc(s.platform)}</div>
        ${socialArt(s, 'POST IMG')}
        <div class="arcade-over">
          <div class="arcade-title">${esc(s.title)}</div>
          <div class="arcade-plat">${esc(s.platform)}</div>
          <div class="arcade-likes">♥ ${esc(s.likes)}</div>
        </div>
      </div>`).join('');
    sectionShell('social','04','SOCIAL MEDIA ARCADE','Posts, stories & graphics. Hover a tile to reveal its stats — click to open full-size.',
      `<div class="arcade-grid">${items}</div>`);
    $$('#screen-social .arcade-cell').forEach(c=>{
      c.addEventListener('mouseenter', sfx.hover);
      c.addEventListener('click', ()=>{
        const s = state.data.social.find(x=>x.id===c.dataset.id);
        makeWindow({ title: s.title, w: s.image?340:undefined, bodyHTML: `
          ${s.image ? `<img class="arcade-img-full" src="${esc(s.image)}" alt="${esc(s.title)}" />` : phTile('SOCIAL GRAPHIC', s.swatch)}
          <div class="win-row"><b>PLATFORM</b><span>${esc(s.platform)}</span></div>
          <div class="win-row"><b>LIKES</b><span>♥ ${esc(s.likes)}</span></div>` });
      });
    });
  }

  /* ---------- BUSINESS CARD INVENTORY ---------- */
  function cardArt(b, side){
    const src = b[side];
    if(src) return `<img class="inv-img" src="${esc(src)}" alt="${esc(b.name)} ${side}" loading="lazy" />`;
    return `<div class="ph" style="--c:${b.swatch};width:100%;height:100%;border:none"><span class="ph-lbl">CARD ART</span></div>`;
  }
  function renderCards(){
    const items = state.data.businessCards.map(b=>`
      <div class="inv-slot" data-id="${esc(b.id)}" style="--c:${b.swatch}">
        <div class="inv-card" style="--c:${b.swatch}">${cardArt(b,'front')}</div>
        <div class="inv-name">${esc(b.name)}</div>
        <div class="inv-rarity r-${esc(b.rarity)}">◆ ${esc(b.rarity)}</div>
        <div class="inv-stock">${esc(b.stock)}</div>
        <div class="inv-flip">↻ FRONT / BACK</div>
      </div>`).join('');
    sectionShell('cards','05','BUSINESS CARD INVENTORY','Print designs as collectible items. Open one to scroll between the front and back.',
      `<div class="inv-grid">${items}</div>`);
    $$('#screen-cards .inv-slot').forEach(c=>{
      c.addEventListener('mouseenter', sfx.hover);
      c.addEventListener('click', ()=>{
        const b = state.data.businessCards.find(x=>x.id===c.dataset.id);
        openCardWindow(b);
      });
    });
  }

  /* card window with a swipe / scroll front↔back viewer */
  function openCardWindow(b){
    const win = makeWindow({ title: b.name, w: 420, cls:'card-win', bodyHTML: `
      <div class="cardview">
        <div class="cardview-track" data-track>
          <figure class="cardview-slide"><div class="cardview-frame">${cardArt(b,'front')}</div><figcaption>FRONT</figcaption></figure>
          <figure class="cardview-slide"><div class="cardview-frame">${cardArt(b,'back')}</div><figcaption>BACK</figcaption></figure>
        </div>
        <div class="cardview-nav">
          <button class="cv-btn" data-prev>◀ FRONT</button>
          <div class="cardview-dots"><span class="cv-dot is-on" data-dot="0"></span><span class="cv-dot" data-dot="1"></span></div>
          <button class="cv-btn" data-next>BACK ▶</button>
        </div>
      </div>
      <div class="win-row" style="margin-top:10px"><b>RARITY</b><span>${esc(b.rarity)}</span></div>
      <div class="win-row"><b>STOCK</b><span>${esc(b.stock)}</span></div>` });

    const track = win.querySelector('[data-track]');
    const dots  = [...win.querySelectorAll('.cv-dot')];
    const slides = win.querySelectorAll('.cardview-slide');
    const goTo = (i)=>{ i=Math.max(0,Math.min(1,i)); slides[i].scrollIntoView?0:0; track.scrollTo({left: i*track.clientWidth, behavior:'smooth'}); };
    win.querySelector('[data-prev]').addEventListener('click', e=>{ e.stopPropagation(); goTo(0); sfx.select(); });
    win.querySelector('[data-next]').addEventListener('click', e=>{ e.stopPropagation(); goTo(1); sfx.select(); });
    dots.forEach((d,i)=> d.addEventListener('click', e=>{ e.stopPropagation(); goTo(i); beep(660,.04); }));
    track.addEventListener('scroll', ()=>{
      const idx = Math.round(track.scrollLeft / Math.max(1,track.clientWidth));
      dots.forEach((d,i)=> d.classList.toggle('is-on', i===idx));
    }, {passive:true});
  }

  /* ---------- ABOUT / CHARACTER ---------- */
  function renderAbout(){
    const a = state.data.about;
    sectionShell('about','06','ABOUT THE DESIGNER','Player profile — stats, skills, tools & quest log.',
      `<div class="about-grid">
        <div class="char-card">
          <div class="char-port">${avatarSVG()}</div>
          <div class="char-name">${esc(a.name)}</div>
          <div class="char-class">CLASS · ${esc(a.class)}</div>
          <div class="char-lvl">LV ${esc(a.level)}</div>
        </div>
        <div class="about-panel">
          <div class="win-block"><div class="wb-bar"><span>▣ BIO.txt</span><span>×</span></div>
            <div class="wb-body"><p class="bio-text">${esc(a.bio)}</p></div></div>
          <div class="win-block"><div class="wb-bar"><span>▣ STATS</span><span>×</span></div>
            <div class="wb-body" id="statBody">
              ${a.stats.map(s=>`<div class="stat-row"><span class="stat-label">${esc(s.label)}</span><div class="stat-bar"><div class="stat-fill" data-v="${s.value}"></div></div><span class="stat-num">${s.value}</span></div>`).join('')}
            </div></div>
          <div class="win-block"><div class="wb-bar"><span>▣ SKILLS</span><span>×</span></div>
            <div class="wb-body"><div class="chiprow">${a.skills.map(s=>`<span class="chip">${esc(s)}</span>`).join('')}</div></div></div>
          <div class="win-block"><div class="wb-bar"><span>▣ TOOLS / INVENTORY</span><span>×</span></div>
            <div class="wb-body"><div class="chiprow">${a.tools.map(t=>`<span class="chip tool">${esc(t)}</span>`).join('')}</div></div></div>
          <div class="win-block"><div class="wb-bar"><span>▣ QUEST LOG / EXPERIENCE</span><span>×</span></div>
            <div class="wb-body">${a.experience.map(e=>`<div class="exp-row"><div><div class="exp-role">${esc(e.role)}</div><div class="exp-place">${esc(e.place)}</div></div><div class="exp-years">${esc(e.years)}</div></div>`).join('')}</div></div>
        </div>
      </div>`);
    // animate stat bars
    requestAnimationFrame(()=>$$('#screen-about .stat-fill').forEach(f=>{ f.style.width = f.dataset.v+'%'; }));
  }

  /* ============================================================
     ACHIEVEMENTS PANEL + SECRET
     ============================================================ */
  function initPanels(){
    $('#achBtn').addEventListener('click', ()=>{ const p=$('#achPanel'); p.classList.toggle('hidden'); if(!p.classList.contains('hidden')){ renderAchList(); sfx.open(); } });
    $('#achClose').addEventListener('click', ()=>{ $('#achPanel').classList.add('hidden'); sfx.close(); });
    $('#secretClose').addEventListener('click', ()=>{ $('#secret').classList.add('hidden'); sfx.close(); });
    $('#navHome').addEventListener('click', goHub);
    $('#navHome').addEventListener('mouseenter', sfx.hover);
  }
  function triggerSecret(){
    state.xp += 50;
    unlock('konami');
    $('#secret').classList.remove('hidden');
    sfx.secret();
    syncHud();
    // confetti of pixels
    spawnError('CHEAT ACTIVATED', 'WARP ZONE unlocked. Nice find, player.');
  }
  function spawnError(title, msg){
    makeWindow({ cls:'err', title, w:320, bodyHTML:
      `<div class="err-body"><div class="err-icon">⚠</div><div>${esc(msg)}</div></div>
       <button class="err-ok" onclick="this.closest('.win').remove()">OK</button>` });
    sfx.error();
  }

  /* ============================================================
     INPUT WIRING
     ============================================================ */
  function initInput(){
    // start
    $('#startBtn').addEventListener('click', ()=>{ ensureCtx(); if(actx.state==='suspended') actx.resume(); sfx.start(); unlock('first_start'); show('hub'); });
    $('#startBtn').addEventListener('mouseenter', sfx.hover);

    // sound toggle
    $('#soundBtn').addEventListener('click', ()=>{
      state.sound = !state.sound; $('#soundState').textContent = state.sound?'ON':'OFF';
      if(state.sound){ ensureCtx(); if(actx.state==='suspended') actx.resume(); beep(880,.08); }
    });

    // konami + esc
    addEventListener('keydown', e=>{
      const k = e.key;
      state.konami.push(k.length===1?k.toLowerCase():k);
      if(state.konami.length>KONAMI.length) state.konami.shift();
      if(KONAMI.every((v,i)=>state.konami[i]===v)){ state.konami=[]; triggerSecret(); }
      if(k==='Escape'){
        if(!$('#secret').classList.contains('hidden')) $('#secret').classList.add('hidden');
        else if(!$('#achPanel').classList.contains('hidden')) $('#achPanel').classList.add('hidden');
        else if(!$('#screen-landing').classList.contains('active')) goHub();
      }
    });

    // double-click the name in HUD area = error easter egg
    $('#hudPlayerWrap');
  }

  /* ============================================================
     BOOT SEQUENCE
     ============================================================ */
  async function loadContent(){
    try{
      const res = await fetch('content.json', {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      return await res.json();
    }catch(err){
      console.error('Could not load content.json —', err.message);
      $('#bootTip').innerHTML = 'content.json failed to load.<br>Run from a server / the preview.';
      return null;
    }
  }

  async function init(){
    initParticles();
    runBoot();
    const data = await loadContent();
    if(!data) return;
    state.data = data;

    renderLanding();
    renderHub();
    renderLogos();
    renderFonts();
    renderBrand();
    renderSocial();
    renderCards();
    renderAbout();

    buildHearts();
    syncHud();
    state.booted = true;
    renderAchList();
    initPanels();
    initInput();

    // easter egg: click the year 5x
    let yClicks=0;
    $('#lYear').addEventListener('click', ()=>{ if(++yClicks>=5){ yClicks=0; spawnError('SYSTEM32', 'You poked the year too many times!'); } });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
