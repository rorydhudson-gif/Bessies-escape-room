
// ===== INTRO HANDOFF (plays intro.mp4 then proceeds) =====
async function playIntroThen(startMain) {
  const introSrc = 'assets/intro/intro.mp4';
  // Play intro only once per session (memory + sessionStorage + localStorage)
  try { if (window.__introPlayed === true) { startMain(); return; } } catch(e){}
  try { if (sessionStorage.getItem('introDone') === '1') { startMain(); return; } } catch(e){}
  try { if (localStorage.getItem('introDone') === '1') { startMain(); return; } } catch(e){}
  try { window.__introPlayed = true; } catch(e){}
  try {
    const head = await fetch(introSrc, { method: 'HEAD' });
    if (!head.ok) throw new Error('no intro');
  } catch {
    try { localStorage.setItem('introDone','1'); } catch(e){}
    try { sessionStorage.setItem('introDone','1'); } catch(e){}
    try { window.__introPlayed = true; } catch(e){}
    startMain();
    return;
  }
  // Ensure intro will not replay again even if the page is reloaded during playback
  try { localStorage.setItem('introDone','1'); } catch(e){}
  try { sessionStorage.setItem('introDone','1'); } catch(e){}
  try { window.__introPlayed = true; } catch(e){}
  const overlay = document.createElement('div');
  Object.assign(overlay.style, { position:'fixed', inset:'0', background:'#000', display:'grid', placeItems:'center', zIndex:'99999' });
  const wrap = document.createElement('div'); wrap.style.position='relative'; wrap.style.width='min(90vw, 1280px)'; wrap.style.maxHeight='90vh'; overlay.appendChild(wrap);
  const video = document.createElement('video'); video.src=introSrc; video.autoplay=true; video.muted=true; video.playsInline=true; video.controls=false;
  Object.assign(video.style,{ width:'100%', height:'auto', borderRadius:'12px', boxShadow:'0 20px 60px rgba(0,0,0,.6)' });
  wrap.appendChild(video);
  const skip = document.createElement('button'); skip.textContent='Skip';
  Object.assign(skip.style,{ position:'absolute', right:'10px', top:'10px', background:'#0008', color:'#fff', border:'1px solid #ffffff44', padding:'8px 12px', borderRadius:'10px', cursor:'pointer' });
  skip.onclick = endIntro; wrap.appendChild(skip);
  const tap = document.createElement('div'); tap.textContent='Tap to start';
  Object.assign(tap.style,{ position:'absolute', inset:'0', display:'grid', placeItems:'center', color:'#fff', fontSize:'18px', background:'transparent', pointerEvents:'none', opacity:'0', transition:'opacity .2s' });
  wrap.appendChild(tap); document.body.appendChild(overlay);
  video.play().catch(()=>{ tap.style.opacity='1'; tap.style.pointerEvents='auto'; tap.onclick=()=>{ tap.style.pointerEvents='none'; tap.style.opacity='0'; video.play().catch(()=>{}); }; });
  video.addEventListener('ended', endIntro);
  function endIntro(){
    overlay.remove();
    try { localStorage.setItem('introDone','1'); } catch(e){}
    try { sessionStorage.setItem('introDone','1'); } catch(e){}
    try { window.__introPlayed = true; } catch(e){}
    startMain();
  }
}

// Debug param toggles hotspot boxes, and 'd' key toggles at runtime
if (new URLSearchParams(location.search).has('debug')) document.body.classList.add('debug');
document.addEventListener('keydown', (e)=>{ if(e.key.toLowerCase()==='d') document.body.classList.toggle('debug'); });

// ===== MAIN APP STARTS AFTER INTRO =====
(async function(){
  await new Promise(res => playIntroThen(res));
  const $ = s=>document.querySelector(s);
  const views={}; const state={ s1:false, s3:false, wiki:false, boarding:false, brief:false, phone:false, portraits:false, cross:false, finale:false };
  function persist(){ try{ localStorage.setItem('escapeState', JSON.stringify(state)); }catch(e){} }
  function restore(){ try{ Object.assign(state, JSON.parse(localStorage.getItem('escapeState')||'{}')); }catch(e){} }
  restore();
  // Fetch JSON with cache-busting during dev to avoid stale config
  async function J(p){
    const url = p + (p.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const r = await fetch(url, { cache: 'no-store' });
    return await r.json();
  }
  function addView(id,title){ const v={ el:document.createElement('div') }; v.el.className='view hidden';
    v.el.innerHTML=`<div class="toolbar"><button class="btn back">← Back</button><div>${title}</div></div><div class="main"></div>`;
    document.body.appendChild(v.el); v.head=v.el.firstChild; v.body=v.el.lastChild; v.head.querySelector('.back').onclick=()=>v.el.classList.add('hidden'); return views[id]=v; }
  const fadeEl=document.createElement('div'); fadeEl.className='fade-screen'; document.body.appendChild(fadeEl);
  function transition(fn){ fadeEl.classList.add('show'); setTimeout(()=>{ try{ fn&&fn(); } finally { setTimeout(()=>fadeEl.classList.remove('show'), 80); } }, 300); }
  function open(id){ transition(()=>{ Object.values(views).forEach(v=>v.el.classList.add('hidden')); const v=views[id]; v.el.classList.remove('hidden'); if (typeof v.onshow==='function') v.onshow(); }); }
  function toast(m){ const d=document.createElement('div'); d.textContent=m; Object.assign(d.style,{position:'fixed',left:'50%',top:'18px',transform:'translateX(-50%)',background:'#000c',border:'1px solid #555',padding:'8px 12px',borderRadius:'10px',zIndex:9e6}); document.body.appendChild(d); setTimeout(()=>d.remove(),1500); }

  // Lightweight audio FX manager (uses real audio if available, otherwise WebAudio tones)
  const FX = (()=>{
    let ctx;
    function ensureCtx(){ if(!ctx){ const C = window.AudioContext||window.webkitAudioContext; if(C) ctx = new C(); } return ctx; }
    const audio = { keydrop: new Audio('assets/audio/keydrop.mp3') };
    function tone(freq=520, dur=0.22){
      const c=ensureCtx(); if(!c) return;
      const o=c.createOscillator(); const g=c.createGain();
      o.type='sine'; o.frequency.value=freq; o.connect(g); g.connect(c.destination);
      g.gain.value=0.0001;
      g.gain.exponentialRampToValueAtTime(0.2, c.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime+dur);
      o.start(); o.stop(c.currentTime+dur+0.02);
    }
    return {
      play(name){
        const a = audio[name];
        if(a){ try{ a.currentTime=0; a.play(); }catch(e){} return; }
        if(name==='fail') tone(240);
        else if(name==='unlock') tone(660);
        else if(name==='door') tone(180, 0.4);
        else tone(520);
      }
    };
  })();

  function showHotspot(id, visible){ const el=document.querySelector(`.hotspot[data-id="${id}"]`); if(el) el.style.display = visible? '' : 'none'; }

  // Room + hotspots
  const room={ el:document.createElement('div'), img:new Image(), overlay:document.createElement('div'), hs:[],
    async init(){
      this.el.className='room'; this.img.className='bg'; this.overlay.className='overlay'; this.img.src='assets/room/room.jpg';
      this.el.appendChild(this.img); this.el.appendChild(this.overlay); document.body.appendChild(this.el);
      window.addEventListener('resize',()=>this.layout()); this.img.addEventListener('load',()=>this.layout());
      const H=[
        {id:'map',x:45,y:32,w:16,h:19,on:()=>open('map')},
        {id:'box',x:52,y:54,w:7,h:8,on:()=>open('box')},
        {id:'photos',x:59,y:55,w:8,h:8,on:()=>open('photos')},
        {id:'laptop',x:45,y:54,w:7,h:8,on:()=>open('laptop')},
        {id:'brief',x:59,y:55,w:8,h:8,on:()=>open('briefcase')},
        {id:'phone',x:30,y:78,w:7,h:7,on:()=>open('phone')},
        {id:'portraits',x:65,y:44,w:16,h:8,on:()=>open('portraits')},
        {id:'door',x:88,y:40,w:8,h:30,on:()=>{ if(state.finale){ FX.play('door'); open('end'); } else toast('Still locked…'); }},
      ];
      this.hs = H.map(h=>{ const b=document.createElement('button'); b.className='hotspot'; Object.assign(b.dataset,{id:h.id,x:h.x,y:h.y,w:h.w,h:h.h}); b.onclick=h.on; this.overlay.appendChild(b); return b; });
      this.layout(); 
      // Locked box should always be clickable from the start
      showHotspot('box', true);
      // Boarding pass hotspot removed (boarding now shown on laptop after Wikipedia)
    },
    layout(){ const r=this.img.getBoundingClientRect(); Object.assign(this.overlay.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
      this.hs.forEach(el=>{ const x=+el.dataset.x,y=+el.dataset.y,w=+el.dataset.w,h=+el.dataset.h; Object.assign(el.style,{left:(x/100)*r.width+'px',top:(y/100)*r.height+'px',width:(w/100)*r.width+'px',height:(h/100)*r.height+'px'}); });
    }
  };

  // Stage 1/2 Map + Box
  const s1 = await J('config/stage1_map.json');
  const mapV=addView('map','Map of Europe'); (function(){ const wrap=document.createElement('div'); wrap.className='map-wrap'; wrap.style.position='relative';
    const tip=document.createElement('div'); tip.className='maptip'; mapV.body.appendChild(wrap); mapV.body.appendChild(tip);
    const W=1100,H=680, B=Object.assign({minLon:-25,maxLon:45,minLat:34,maxLat:72,padding:10}, s1.bounds||{});
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.style.width='100%'; wrap.appendChild(svg);
    const bg=document.createElementNS(svg.namespaceURI,'rect'); bg.setAttribute('x','10'); bg.setAttribute('y','10'); bg.setAttribute('width',W-20); bg.setAttribute('height',H-20); bg.setAttribute('rx','16'); bg.setAttribute('fill','#121212'); bg.setAttribute('stroke','rgba(255,255,255,0.08)'); svg.appendChild(bg);
    // Map image
    const imgEl=document.createElementNS(svg.namespaceURI,'image'); 
    imgEl.setAttribute('x','10'); imgEl.setAttribute('y','10'); imgEl.setAttribute('width',String(W-20)); imgEl.setAttribute('height',String(H-20));
    imgEl.setAttribute('href','assets/map/europe.png'); imgEl.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.appendChild(imgEl);

    // Debug panel: quick tools for calibration (shows in ?debug)
    if (document.body.classList.contains('debug')) {
      const panel = document.createElement('div');
      Object.assign(panel.style, {
        position:'absolute', left:'14px', top:'14px', zIndex: 1000,
        background:'#000c', border:'1px solid #ffffff33', padding:'8px',
        borderRadius:'10px', display:'flex', gap:'6px', alignItems:'center'
      });
      const btnPins = document.createElement('button'); btnPins.className='btn'; btnPins.textContent='Copy Pins';
      const btnBounds = document.createElement('button'); btnBounds.className='btn'; btnBounds.textContent='Copy Bounds';
      const btnReload = document.createElement('button'); btnReload.className='btn'; btnReload.textContent='Reload';
      const note = document.createElement('span'); note.style.color='#bbb'; note.style.fontSize='12px'; note.textContent='(values to console)';
      panel.appendChild(btnPins); panel.appendChild(btnBounds); panel.appendChild(btnReload); panel.appendChild(note);
      wrap.appendChild(panel);

      // Helpers for conversions
      const PAD_DBG = (B.padding ?? 10), innerW_dbg = W - 2*PAD_DBG, innerH_dbg = H - 2*PAD_DBG;
      function xyToLatLonLocal(x,y){
        const lon = B.minLon + ((x - PAD_DBG) / innerW_dbg) * (B.maxLon - B.minLon);
        const lat = B.minLat + (1 - ((y - PAD_DBG) / innerH_dbg)) * (B.maxLat - B.minLat);
        return { lat, lon };
      }

      btnPins.onclick = () => {
        // Read current positions (including any dragged pins), convert to lat/lon, and print a pins array for config
        const pinsOut = [...svg.querySelectorAll('g.pin')].map(g => {
          const c = g.querySelector('circle');
          const cx = parseFloat(c.getAttribute('cx')), cy = parseFloat(c.getAttribute('cy'));
          const geo = xyToLatLonLocal(cx, cy);
          return {
            name: g.dataset.name,
            lat: +geo.lat.toFixed(6),
            lon: +geo.lon.toFixed(6),
            // Preserve color/type if known on the element dataset (fallback to red/real)
            color: g.dataset.color || 'red',
            type: g.dataset.type || 'real'
          };
        });
        console.log('--- Paste into config/stage1_map.json -> pins:');
        console.log(JSON.stringify(pinsOut, null, 2));
        try { toast('Pins copied to console'); } catch(e){}
      };

      btnBounds.onclick = () => {
        console.log('--- Paste into config/stage1_map.json -> bounds:');
        console.log(JSON.stringify({
          minLon: B.minLon, maxLon: B.maxLon, minLat: B.minLat, maxLat: B.maxLat,
          padding: (B.padding ?? 10)
        }, null, 2));
        try { toast('Bounds copied to console'); } catch(e){}
      };

      // Dev convenience: reload config and re-render pins/bounds without full page refresh
      btnReload.onclick = async () => {
        try {
          const fresh = await J('config/stage1_map.json');
          // update bounds in-place
          Object.assign(B, Object.assign({minLon:-25,maxLon:45,minLat:34,maxLat:72,padding:10}, fresh.bounds||{}));
          // update pins and redraw
          s1.pins = fresh.pins || s1.pins;
          renderPins();

    // Re-fetch config each time the Map view is shown (so edits to JSON reflect without full reload)
    mapV.onshow = async () => {
      try {
        const fresh = await J('config/stage1_map.json');
        Object.assign(B, Object.assign({minLon:-25,maxLon:45,minLat:34,maxLat:72,padding:10}, fresh.bounds||{}));
        s1.pins = fresh.pins || s1.pins;
        renderPins();
        if (document.body.classList.contains('debug')) try { toast('Map config refreshed'); } catch(e){}
      } catch (e) {
        console.error('Failed to refresh map config on show', e);
      }
    };

    // Re-fetch config each time the Map view is shown (so edits to JSON reflect without full reload)
    mapV.onshow = async () => {
      try {
        const fresh = await J('config/stage1_map.json');
        Object.assign(B, Object.assign({minLon:-25,maxLon:45,minLat:34,maxLat:72,padding:10}, fresh.bounds||{}));
        s1.pins = fresh.pins || s1.pins;
        renderPins();
        if (document.body.classList.contains('debug')) try { toast('Map config refreshed'); } catch(e){}
      } catch (e) {
        console.error('Failed to refresh map config on show', e);
      }
    };
          toast('Reloaded pins and bounds');
        } catch (e) {
          console.error(e);
          toast('Failed to reload config');
        }
      };
    }
    // Project lat/lon into the inner framed map area (padding from bounds)
    function proj(lat,lon){
      const PAD = (B.padding ?? 10), innerW = W - 2*PAD, innerH = H - 2*PAD;
      const x = PAD + ((lon - B.minLon) / (B.maxLon - B.minLon)) * innerW;
      const y = PAD + (1 - ((lat - B.minLat) / (B.maxLat - B.minLat))) * innerH;
      return { x, y };
    }
    function renderPins(){
      // remove existing pins
      [...svg.querySelectorAll('g.pin')].forEach(n=>n.remove());
      // draw from current s1.pins using current bounds B
      (s1.pins||[]).forEach(p=>{
        const g=document.createElementNS(svg.namespaceURI,'g');
        g.classList.add('pin');
        g.dataset.name=p.name;
        g.dataset.lat=p.lat;
        g.dataset.lon=p.lon;
        g.dataset.color=p.color||'red';
        g.dataset.type=p.type||'real';
        const c=document.createElementNS(svg.namespaceURI,'circle');
        const pos=proj(p.lat,p.lon);
        c.setAttribute('cx',pos.x);
        c.setAttribute('cy',pos.y);
        c.setAttribute('r','7');
        c.setAttribute('fill', (p.color==='red')?'#d44':'#58f');
        g.appendChild(c);
        svg.appendChild(g);
      });
    }
    renderPins();
    svg.addEventListener('mousemove',e=>{
      const g=e.target.closest('.pin');
      const r=wrap.getBoundingClientRect();
      const xSvg = (e.clientX - r.left) * (W / r.width);
      const ySvg = (e.clientY - r.top) * (H / r.height);
      const PAD = (B.padding ?? 10), innerW = W - 2*PAD, innerH = H - 2*PAD;

      if(g){
        // Hovering a pin: show pin's stored lat/lon with directional suffix
        const lat=parseFloat(g.dataset.lat), lon=parseFloat(g.dataset.lon);
        tip.innerHTML=`<strong>${g.dataset.name}</strong><br>${Math.round(Math.abs(lat)*1000)/1000}° ${lat>=0?'N':'S'}, ${Math.round(Math.abs(lon)*1000)/1000}° ${lon>=0?'E':'W'}`;
        tip.style.left=(e.clientX-r.left)+'px';
        tip.style.top=(e.clientY-r.top)+'px';
        tip.classList.add('show');
      } else if (document.body.classList.contains('debug')) {
        // Calibration overlay (debug): show cursor lat/lon computed from mouse
        const lon = B.minLon + ((Math.max(PAD, Math.min(W-PAD, xSvg)) - PAD) / innerW) * (B.maxLon - B.minLon);
        const lat = B.minLat + (1 - ((Math.max(PAD, Math.min(H-PAD, ySvg)) - PAD) / innerH)) * (B.maxLat - B.minLat);
        tip.innerHTML = `<strong>Cursor</strong><br>${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        tip.style.left=(e.clientX-r.left)+'px';
        tip.style.top=(e.clientY-r.top)+'px';
        tip.classList.add('show');
      } else {
        tip.classList.remove('show');
      }
    });
    svg.addEventListener('mouseleave',()=>tip.classList.remove('show'));

    // Debug: allow dragging pins to log new lat/lon (enable with ?debug)
    if (document.body.classList.contains('debug')) {
      const PAD_DBG = (B.padding ?? 10), innerW = W - 2*PAD_DBG, innerH = H - 2*PAD_DBG;
      function clientToSvg(e){
        const r = wrap.getBoundingClientRect();
        const sx = W / r.width, sy = H / r.height;
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
      }
      function xyToLatLon(x,y){
        const lon = B.minLon + ((x - PAD_DBG) / innerW) * (B.maxLon - B.minLon);
        const lat = B.minLat + (1 - ((y - PAD_DBG) / innerH)) * (B.maxLat - B.minLat);
        return { lat, lon };
      }
      let dragging = null, dragCircle = null;
      svg.addEventListener('mousedown', (e) => {
        const g = e.target.closest('.pin'); if (!g) return;
        dragCircle = g.querySelector('circle'); if (!dragCircle) return;
        dragging = { g };
        e.preventDefault();
      });
      svg.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const p = clientToSvg(e);
        const x = Math.max(PAD_DBG, Math.min(W - PAD_DBG, p.x));
        const y = Math.max(PAD_DBG, Math.min(H - PAD_DBG, p.y));
        dragCircle.setAttribute('cx', x);
        dragCircle.setAttribute('cy', y);
        const geo = xyToLatLon(x, y);
        tip.innerHTML = `<strong>${dragging.g.dataset.name}</strong><br>${geo.lat.toFixed(6)}, ${geo.lon.toFixed(6)}`;
        tip.classList.add('show');
      });
      svg.addEventListener('mouseup', () => {
        if (!dragging) return;
        const cx = parseFloat(dragCircle.getAttribute('cx'));
        const cy = parseFloat(dragCircle.getAttribute('cy'));
        const geo = xyToLatLon(cx, cy);
        // Update datasets and in-memory pins so hover shows latest and Copy Pins reflects changes
        const nm = dragging.g.dataset.name;
        const latF = +geo.lat.toFixed(6), lonF = +geo.lon.toFixed(6);
        dragging.g.dataset.lat = String(latF);
        dragging.g.dataset.lon = String(lonF);
        const idx = (s1.pins||[]).findIndex(p=>p.name===nm);
        if (idx > -1) { s1.pins[idx].lat = latF; s1.pins[idx].lon = lonF; }

        console.log(JSON.stringify({ name: nm, lat: latF, lon: lonF }));
        try { toast(`Pinned ${nm}: ${latF}, ${lonF} (see console)`); } catch(e){}
        dragging = null;
        dragCircle = null;
      });
    }

    // When leaving the Map, mark Stage 1 as visited and reveal the Lockbox hotspot in the room
    const mapBack = mapV.head.querySelector('.back');
    if (mapBack) {
      mapBack.onclick = () => {
        state.s1Visited = true;
        persist();
        mapV.el.classList.add('hidden');
        showHotspot('box', true);
      };
    }
  })();
  const boxV=addView('box','Padlocked Box'); (function(){
    // Wrapper
    const wrap=document.createElement('div');
    Object.assign(wrap.style,{
      position:'relative',
      minHeight:'60vh',
      display:'grid',
      placeItems:'center',
      background:'#000'
    });

    // Main box image (place your PNG at: assets/box.png)
    const img=new Image();
    img.src='assets/box.png';
    Object.assign(img.style,{
      maxWidth:'min(95vw,1100px)',
      maxHeight:'70vh',
      width:'auto',
      height:'auto',
      objectFit:'contain',
      borderRadius:'12px',
      boxShadow:'0 20px 60px rgba(0,0,0,.6)'
    });
    img.onerror=()=>{ img.alt='assets/box.png not found — add your PNG to /assets/box.png'; };

    // Bottom input bar
    const bar=document.createElement('div');
    Object.assign(bar.style,{
      position:'absolute',
      left:'0', right:'0', bottom:'0',
      display:'grid',
      gridTemplateColumns:'auto 160px auto',
      gap:'8px',
      padding:'12px',
      alignItems:'center',
      background:'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4), transparent)'
    });
    bar.innerHTML = `
      <label style="color:#bbb;">Enter 6-digit code</label>
      <input id="pad" maxlength="6" inputmode="numeric" placeholder="••••••"
             style="padding:10px;border-radius:10px;border:1px solid var(--line);background:#111;color:#fff"/>
      <button class="btn" id="go">Unlock</button>
      <div class="hint" id="msg" style="grid-column: 1 / -1;"></div>
    `;

    wrap.appendChild(img);
    wrap.appendChild(bar);
    boxV.body.appendChild(wrap);

    // Submit handler
    bar.querySelector('#go').onclick=async ()=>{
      const v=(bar.querySelector('#pad').value||'').trim();
      const msg=bar.querySelector('#msg');
      if(v===s1.padlockCode){
        state.s1=true; persist();
        FX.play('unlock');

        // Play box open video, then reveal photos stage
        const overlay=document.createElement('div');
        Object.assign(overlay.style,{position:'fixed',inset:'0',background:'#000e',display:'grid',placeItems:'center',zIndex:'99999'});
        const vid=document.createElement('video');
        vid.src='assets/boxopen.mp4';
        vid.autoplay=true;
        vid.controls=false;
        vid.playsInline=true;
        Object.assign(vid.style,{maxWidth:'min(95vw,1100px)',maxHeight:'80vh',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,.6)'});
        overlay.appendChild(vid); document.body.appendChild(overlay);
        const end=()=>{ try{ overlay.remove(); }catch(e){} open('photos'); };
        vid.addEventListener('ended', end);
        vid.addEventListener('error', end);
        try { await vid.play(); } catch(e){ end(); }
      } else {
        state._fails=(state._fails||0)+1;
        msg.textContent = state._fails===1? s1.failHints[0] : s1.failHints[1];
        FX.play('fail');
      }
    };
  })();

  // Stage 3 Photos
  const s3=await J('config/stage3_photos.json');
  const photosV=addView('photos','Photo Chronology'); (function(){
    const wrap=document.createElement('div'); wrap.className='photos';
    const hint=document.createElement('div'); hint.className='hint'; hint.textContent=s3.hintText;
    const tray=document.createElement('div'); tray.className='tray';
    const slots=document.createElement('div'); slots.className='slots';
    // Layout: hint on top, slots in middle, tray pinned to bottom
    Object.assign(wrap.style, { display:'grid', gridTemplateRows:'auto 1fr minmax(16vh, 24vh)', gap:'8px', minHeight:'calc(100vh - 120px)' });
    Object.assign(tray.style, { position:'relative', height:'clamp(16vh, 22vh, 26vh)', background:'transparent', overflow:'hidden' });
    Object.assign(slots.style, {
      display:'grid',
      gridTemplateColumns:`repeat(${s3.orderCorrect.length}, minmax(120px, 1fr))`,
      gap:'12px',
      alignContent:'start',
      justifyItems:'stretch'
    });
    for(let i=0;i<s3.orderCorrect.length;i++){ const s=document.createElement('div'); s.className='slot'; slots.appendChild(s); }
    wrap.appendChild(hint); wrap.appendChild(slots); wrap.appendChild(tray); 
    // Controls row (Reset + Final word + Continue)
    const controls=document.createElement('div'); controls.style.display='flex'; controls.style.gap='8px'; controls.style.alignItems='center';
    const resetBtn=document.createElement('button'); resetBtn.className='btn'; resetBtn.textContent='Reset';
    const finalText=document.createElement('div'); finalText.className='hint'; finalText.textContent=''; finalText.style.opacity='0'; finalText.style.marginLeft='auto';
    const contBtn=document.createElement('button'); contBtn.className='btn'; contBtn.textContent='Continue'; contBtn.disabled=true; contBtn.style.opacity='0.5';
    contBtn.onclick=()=>{ photosV.el.classList.add('hidden'); toast('Laptop ready — use the hotspot in the room.'); };

    resetBtn.onclick=()=>{
      // Move all photos back to the tray and clear placements
      slots.querySelectorAll('.polaroid').forEach(pol=>{
        tray.appendChild(pol);
        Object.assign(pol.style,{ position:'absolute', width:'', height:'' });
        const glow=pol.querySelector('.glow'); if(glow) glow.style.opacity=0;
      });
      for(let k=0;k<placed.length;k++) placed[k]=null;
      layoutTray();
      finalText.textContent=''; finalText.style.opacity='0';
      contBtn.disabled=true; contBtn.style.opacity='0.5';
      toast('Photos reset.');
    };
    controls.appendChild(resetBtn);
    controls.appendChild(finalText);
    controls.appendChild(contBtn);
    photosV.body.appendChild(controls);
    photosV.body.appendChild(wrap);
    const files=s3.photos.map(p=>p.file), shuffled=s3.randomizeOnLoad? files.slice().sort(()=>Math.random()-0.5): files.slice();
    const letters=new Map(s3.photos.map(p=>[p.file,p.letter])); const correct=s3.orderCorrect; const placed=new Array(correct.length).fill(null);
    function spawn(file){
      const p=document.createElement('div'); p.className='polaroid'; p.draggable=true;
      const img=new Image(); img.src='assets/photos/'+file;
      Object.assign(img.style,{ maxWidth:'100%', maxHeight:'100%', objectFit:'cover' });
      p.appendChild(img);
      const glow=document.createElement('div'); glow.className='glow'; 
      glow.style.pointerEvents = 'none'; glow.style.zIndex = '3';
      const letter = (letters.get(file) || '').toUpperCase();
      glow.textContent = letter;
      p.appendChild(glow);
      tray.appendChild(p);

      // Evenly distribute across the bottom tray
      p.style.position='absolute';
      const idx = tray.querySelectorAll('.polaroid').length - 1;
      const N = s3.photos.length || 8;
      const leftPct = ((idx + 0.5) / N) * 100;
      p.style.left = leftPct + '%';
      p.style.top = '50%';
      p.style.transform=`translate(-50%,-50%) rotate(${(Math.random()*10-5).toFixed(1)}deg)`;
      p.style.zIndex='2';

      p.addEventListener('dragstart',e=>{
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain',file);
      });
      // Recompute tray layout to size and space items responsively
      layoutTray();
    }
    // Layout helper to evenly distribute photos in the tray (bottom area)
    function layoutTray(){
      const arr=[...tray.querySelectorAll('.polaroid')];
      const N = Math.max(arr.length, s3.photos.length || 8);
      const r = tray.getBoundingClientRect();
      const gap = 8;
      const avail = Math.max(0, r.width - (N * gap));
      const pw = Math.max(80, Math.min(140, Math.floor(avail / N))); // clamp width so all 8 fit
      const ph = Math.floor(pw * 1.25); // portrait ratio
      arr.forEach((p,idx)=>{
        const leftPct = ((idx + 0.5) / N) * 100;
        p.style.width = pw + 'px';
        p.style.height = ph + 'px';
        p.style.left = leftPct + '%';
        p.style.top = '50%';
        p.style.transform = `translate(-50%,-50%) rotate(${(Math.random()*10-5).toFixed(1)}deg)`;
        p.style.zIndex = '2';
      });
    }
    window.addEventListener('resize', layoutTray);
    photosV.onshow = ()=>{ try { layoutTray(); } catch(e){} };

    // Allow dragging photos back out of slots into the tray
    tray.addEventListener('dragover', e => e.preventDefault());
    tray.addEventListener('drop', e => {
      e.preventDefault();
      const file = e.dataTransfer.getData('text/plain');
      if (!file) return;
      // Find the dragged polaroid in the DOM
      const pol = [...document.querySelectorAll('.polaroid')]
        .find(el => { const im = el.querySelector('img'); return im && im.src.includes(file); });
      if (!pol) return;

      // Clear any previous placement
      const prevIdx = placed.findIndex(f => f === file);
      if (prevIdx > -1) placed[prevIdx] = null;

      // Move back to tray and restore styling
      tray.appendChild(pol);
      Object.assign(pol.style, { position: 'absolute', width: '', height: '' });
      const glow = pol.querySelector('.glow'); if (glow) glow.style.opacity = 0;
      const im = pol.querySelector('img'); if (im) Object.assign(im.style, { width:'', height:'', maxWidth:'100%', maxHeight:'100%', objectFit:'cover' });

      layoutTray();
    });

    slots.querySelectorAll('.slot').forEach((slot,i)=>{
      slot.addEventListener('dragover',e=>e.preventDefault());
      slot.addEventListener('drop',e=>{
        e.preventDefault();
        const file=e.dataTransfer.getData('text/plain');
        if(!file) return;

        // Find the dragged polaroid in the DOM (tray or from another slot)
        const pol=[...document.querySelectorAll('.polaroid')]
          .find(el=>{ const im=el.querySelector('img'); return im && im.src.includes(file); });
        if(!pol) return;

        // If this photo was previously placed in some slot, clear that placement
        const prevIdx = placed.findIndex(f=>f===file);
        if (prevIdx > -1) placed[prevIdx] = null;

        // If this slot already has a photo, move it back to the tray (allow swap)
        const existing = slot.querySelector('.polaroid');
        if (existing) {
          tray.appendChild(existing);
          Object.assign(existing.style,{ position:'absolute', width:'', height:'' });
          const gPrev = existing.querySelector('.glow'); if (gPrev) gPrev.style.opacity = 0;
          layoutTray();
        }

        // Snap the new photo into the slot; keep it positioned relative so the glow anchors to the photo
        slot.appendChild(pol);
        Object.assign(pol.style,{ position:'relative', left:'', top:'', transform:'none', width:'100%', height:'100%' });
        { const im = pol.querySelector('img'); if (im) Object.assign(im.style, { width:'100%', height:'100%', objectFit:'cover' }); }

        // Track placement
        placed[i]=file;

        // Update letter glow: only show if correct for this position
        const glow=pol.querySelector('.glow');
        if (glow) glow.style.opacity = (file===correct[i]) ? 1 : 0;

                // If all positions are correct, reveal final word and enable continue (do not auto-leave)
        if(placed.every((f,idx)=>f===correct[idx])){
          state.s3=true; persist();
          FX.play('success');
          finalText.textContent = String(s3.finalWord || '').toUpperCase();
          finalText.style.opacity = '1';
          contBtn.disabled = false;
          contBtn.style.opacity = '1';
          toast('✔ Photos complete — password revealed.');
        }
      });
    });
    shuffled.forEach(spawn);
  })();

  // Stage 4 Laptop — Live Wikipedia
  const s4=await J('config/stage4_wikipedia.json'); const laptopV=addView('laptop','Laptop'); (function(){
    const wrap=document.createElement('div'); 
wrap.style.display='grid'; 
wrap.style.placeItems='center';
const shell=document.createElement('div'); 
shell.style.position='relative'; 
shell.style.width='min(95vw,1100px)'; 
shell.style.maxWidth='1100px';
const art=new Image(); 
art.src='assets/laptop/laptop.png'; 
art.alt='laptop';
Object.assign(art.style,{width:'100%',height:'auto',display:'block',filter:'drop-shadow(0 20px 60px rgba(0,0,0,.6))'});
shell.appendChild(art);
// Screen overlay area (temp placeholder dimensions; we will refine later)
const screen=document.createElement('div'); 
const scr = (s4 && s4.screen) || {};
const wikiScr = (s4 && s4.wikiScreen) || { left: 5, top: 5, width: 90, height: 80 };
function pct(v, fallback){ return (v != null ? (String(v).endsWith('%') ? String(v) : String(v) + '%') : fallback); }
function setScreenRect(rect){
  if(!rect) return;
  screen.style.left   = pct(rect.left,   '18.3%');
  screen.style.top    = pct(rect.top,    '30%');
  screen.style.width  = pct(rect.width,  '43%');
  screen.style.height = pct(rect.height, '36%');
}
Object.assign(screen.style,{
  position:'absolute',
  display:'grid',
  placeItems:'stretch',
  overflow:'hidden'
});
setScreenRect(scr);
// Debug: show overlay bounds to help alignment
if (document.body.classList.contains('debug')) {
  screen.style.outline = '1px dashed rgba(255,255,0,.6)';
}
shell.appendChild(screen);
wrap.appendChild(shell);

// Dock for audio instructions (outside laptop screen)
const audioDock=document.createElement('div');
Object.assign(audioDock.style,{ position:'absolute', right:'2%', bottom:'6%', zIndex:'5' });
shell.appendChild(audioDock);

    // Password gate
    const passWrap=document.createElement('div');
    Object.assign(passWrap.style,{
      width:'100%',height:'100%',display:'grid',placeItems:'center',
      background:'linear-gradient(180deg,#0e1b2e,#102a47)'
    });

    // Windows-like lock UI (time/date + avatar + small password bar)
    const lockUI=document.createElement('div');
    Object.assign(lockUI.style,{position:'relative',width:'100%',height:'100%',display:'grid',placeItems:'center'});

    const stack=document.createElement('div');
    Object.assign(stack.style,{display:'grid',gap:'16px',placeItems:'center'});

    const timeEl=document.createElement('div');
    Object.assign(timeEl.style,{fontSize:'64px',letterSpacing:'1px',fontWeight:'600',color:'#fff',textShadow:'0 4px 18px rgba(0,0,0,.45)'});

    const dateEl=document.createElement('div');
    Object.assign(dateEl.style,{fontSize:'18px',color:'#e6eefc',opacity:'0.9',textShadow:'0 2px 8px rgba(0,0,0,.45)'});

    const avatar=document.createElement('div');
    Object.assign(avatar.style,{width:'80px',height:'80px',borderRadius:'50%',background:'rgba(255,255,255,.85)',boxShadow:'0 8px 24px rgba(0,0,0,.35)'});

    const inputWrap=document.createElement('div');
    Object.assign(inputWrap.style,{display:'grid',placeItems:'center',marginTop:'6px'});

    const pwInput=document.createElement('input');
    pwInput.id='pw';
    pwInput.type='password';
    Object.assign(pwInput.style,{
      width:'260px',height:'28px',background:'#fff',color:'#000',
      border:'none',borderRadius:'4px',padding:'0 10px',outline:'none',
      textTransform:'uppercase',boxShadow:'0 6px 18px rgba(0,0,0,.25)'
    });
    inputWrap.appendChild(pwInput);

    stack.appendChild(timeEl);
    stack.appendChild(dateEl);
    stack.appendChild(avatar);
    stack.appendChild(inputWrap);

    lockUI.appendChild(stack);
    passWrap.appendChild(lockUI);

    function updateClock(){
      const d=new Date();
      const hh=String(d.getHours()).padStart(2,'0'), mm=String(d.getMinutes()).padStart(2,'0');
      timeEl.textContent = `${hh}:${mm}`;
      const options={ weekday:'long', month:'long', day:'numeric' };
      try { dateEl.textContent = d.toLocaleDateString(undefined, options); } catch { dateEl.textContent = d.toDateString(); }
    }
    updateClock();
    const _clkTimer = setInterval(updateClock, 30000);

    // Main Wikipedia content (hidden until password is correct)
const content=document.createElement('div');
Object.assign(content.style, {
  display:'none', // becomes 'grid' after unlock
  width:'100%',
  height:'100%',
  gridTemplateRows:'auto 1fr auto'
});

// Full-page Wikipedia overlay (for gameplay after password)
let wikiFull = null;
let wikiFullPlaceholder = document.createComment('wiki-full-anchor');
function enterWikiFull(){
  if (wikiFull) return;
  // Create full-viewport overlay and move content into it
  wikiFull = document.createElement('div');
  Object.assign(wikiFull.style, {
    position:'fixed', inset:'0', background:'#fff',
    display:'grid', gridTemplateRows:'auto 1fr auto',
    zIndex:'99998' // below the intro overlay if any remains
  });
  // Keep a placeholder to restore original DOM position later
  screen.parentNode && screen.parentNode.insertBefore(wikiFullPlaceholder, screen.nextSibling);
  // Move the content UI (status/frame/nav) into overlay
  try { content.parentNode && content.parentNode.removeChild(content); } catch(e){}
  wikiFull.appendChild(content);
  document.body.appendChild(wikiFull);
}
function exitWikiFull(){
  if (!wikiFull) return;
  // Move content back to the laptop screen area and remove overlay
  try { wikiFull.removeChild(content); } catch(e){}
  screen.appendChild(content);
  try { wikiFull.remove(); } catch(e){}
  wikiFull = null;
  // Ensure cropped view uses the Wikipedia gameplay rect when exiting fullscreen mid-game
  try { setScreenRect(wikiScr); } catch(e){}
}

 // Persistent boarding pass view (shown after Wikipedia success)
let bpWrap=null;
function showBoarding(){
  // Revert to the password/laptop crop for the boarding pass
  try { setScreenRect(scr); } catch(e){}
  if(!bpWrap){
    bpWrap=document.createElement('div');
    Object.assign(bpWrap.style,{
      position:'relative',
      width:'100%',height:'100%',display:'grid',placeItems:'center',
      background:'#f3f3f3'
    });
    const img=new Image();
    // Preferred asset (user supplied): boardingpass.jpg, configurable via s4.boardingImage
    const preferred = (s4 && s4.boardingImage) || 'assets/briefcase/boardingpass.jpg';
    img.src = preferred;
    img.onerror = () => { if (preferred.indexOf('boarding_pass.png') === -1) img.src = 'assets/briefcase/boarding_pass.png'; };
    img.alt='Boarding Pass';
    Object.assign(img.style,{
      maxWidth:'100%',maxHeight:'100%',objectFit:'contain',
      boxShadow:'0 10px 40px rgba(0,0,0,.3)',borderRadius:'8px'
    });
    // Exit button to leave laptop and return to main room
    const exit=document.createElement('button');
    exit.textContent='Exit Laptop';
    Object.assign(exit.style,{
      position:'absolute', right:'10px', top:'10px',
      background:'#000b', color:'#fff', border:'1px solid #ffffff44',
      padding:'8px 12px', borderRadius:'10px', cursor:'pointer'
    });
    exit.onclick=()=>transition(()=>{ laptopV.el.classList.add('hidden'); });
    bpWrap.appendChild(img);
    bpWrap.appendChild(exit);
    screen.appendChild(bpWrap);
  }
  passWrap.style.display='none';
  content.style.display='none';
  bpWrap.style.display='';
}

    const audio=document.createElement('audio'); audio.controls=true; audio.src=s4.audioInstructions||'';
    const frame=document.createElement('div'); 
frame.className='frame'; 
const page=document.createElement('div'); 
page.className='page'; 
frame.appendChild(page);
// Fill the laptop "screen" area
Object.assign(frame.style,{ width:'100%', height:'100%', background:'#fff', position:'relative' });
Object.assign(page.style,{
  position:'absolute', left:'0', top:'0', right:'0', bottom:'0',
  width:'100%', height:'100%',
  overflow:'auto', background:'#fff', color:'#111',
  padding:'12px', lineHeight:'1.6',
  WebkitOverflowScrolling:'touch', overscrollBehavior:'contain'
});
    const nav=document.createElement('div'); 
    const back=document.createElement('button'); back.className='btn'; back.textContent='← Back'; 
    const reset=document.createElement('button'); reset.className='btn'; reset.textContent='Reset'; 
    const fsBtn=document.createElement('button'); fsBtn.className='btn'; fsBtn.textContent='Fullscreen';
    function updateFsBtn(){ fsBtn.textContent = (wikiFull ? 'Exit Fullscreen' : 'Fullscreen'); }
    fsBtn.onclick=()=>{ if (wikiFull) exitWikiFull(); else enterWikiFull(); updateFsBtn(); };
    nav.appendChild(back); nav.appendChild(reset); nav.appendChild(fsBtn);
    const status=document.createElement('div'); status.style.margin='8px'; status.style.color='var(--muted)';

    audioDock.appendChild(audio); content.appendChild(status); content.appendChild(frame); content.appendChild(nav);
    screen.appendChild(passWrap); screen.appendChild(content); laptopV.body.appendChild(wrap);
    laptopV.onshow = () => {
      // If the Wikipedia game has been completed, keep the laptop showing the boarding pass persistently
      if (state.laptopBoarding) {
        showBoarding();
      } else {
        try { setScreenRect(scr); } catch(e){}
        setTimeout(()=>pwInput.focus(), 50);
        try { updateFsBtn && updateFsBtn(); } catch(e){}
      }
    };
    // Unlock laptop with password (from Stage 3 final word) — minimalist UI (Enter key submits)
    function unlockLaptop(){
      const v = (pwInput.value || '').trim().toLowerCase();
      const pw = String((s3 && s3.finalWord) || '').toLowerCase();
      if (v === pw) {
        FX.play('unlock');
        passWrap.style.display = 'none';
        content.style.display = 'grid';
        // When the Wikipedia game starts, switch to the gameplay crop
        try { setScreenRect(wikiScr); } catch(e){}
        // Start Wikipedia puzzle within laptop screen (toggleable to fullscreen)
        load(START);
        try { updateFsBtn && updateFsBtn(); } catch(e){}
      } else {
        // Minimal feedback only via sound
        FX.play('fail');
      }
    }
    pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') unlockLaptop(); });

    let clicks=0, hist=[]; const MAX=s4.maxClicks||10, START=s4.start||'RuPaul', DEST=s4.destination||'Cricket', ALLOW_BACK=!!s4.allowBack;
    function t(s){ return (s||'').trim().replace(/_/g,' ').toLowerCase(); }
    function done(tt){ return t(tt)===t(DEST); }
    async function get(title){
      const url=`https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=text&redirects=true&origin=*&page=${encodeURIComponent(title)}`;
      try{
        const res=await fetch(url, { mode:'cors', headers:{ 'Accept':'application/json' } });
        if(!res.ok) throw new Error('HTTP '+res.status);
        const data=await res.json();
        const html = data && data.parse && data.parse.text && data.parse.text['*'];
        const t = (data && data.parse && data.parse.title) || title;
        return { html: html || '<p>Failed to load.</p>', title: t };
      }catch(e){
        console.error('Wiki fetch failed', e);
        try{ toast('Could not load Wikipedia. Check the network.'); }catch(_){}
        return { html:'<p>Failed to load.</p>', title };
      }
    }
    function mount(html,title){
      page.innerHTML = html;
      // Ensure content is readable and fits container
      try {
        page.style.scrollBehavior = 'smooth';
        page.querySelectorAll('img').forEach(im => { im.style.maxWidth = '100%'; im.style.height = 'auto'; });
        page.querySelectorAll('table').forEach(tb => { tb.style.maxWidth = '100%'; tb.style.width = '100%'; tb.style.borderCollapse = 'collapse'; });
        page.querySelectorAll('a').forEach(a => { a.style.color = '#0645ad'; });
      } catch {}
      page.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href') || '';
        let article = null;
        if (href.startsWith('/wiki/')) {
          article = decodeURIComponent(href.slice('/wiki/'.length));
        } else if (href.startsWith('https://en.wikipedia.org/wiki/') || href.startsWith('http://en.wikipedia.org/wiki/')) {
          const idx = href.indexOf('/wiki/');
          article = decodeURIComponent(idx > -1 ? href.slice(idx + '/wiki/'.length) : '');
        }
        a.addEventListener('click', e => {
          e.preventDefault();
          if (!article) return;
          if (article.includes(':')) return; // skip special/meta pages
          click(article);
        });
      });
      status.textContent = `Viewing: ${title}`;
    }
    async function load(title){
      const {html,title:ct}=await get(title);
      mount(html,ct);
      if(done(ct) && clicks<=MAX){
        state.wiki=true;
        state.laptopBoarding=true;
        persist();
        FX.play('success');
        // Leave full-screen mode and show the boarding pass at laptop screen dimensions
        exitWikiFull();
        toast('Wikipedia goal reached — the boarding pass is now on the laptop.');
        // Show boarding pass on the laptop and persist this state
        showBoarding();
      }
    }
    function click(next){ if(clicks>=MAX){ toast('Click limit reached. Reset to try again.'); return; } const cur=status.textContent.replace(/^Viewing:\\s*/,'').trim(); if(cur && (!hist.length || t(hist[hist.length-1])!==t(cur))) hist.push(cur); clicks++; load(next); }
    back.onclick=()=>{ if(!ALLOW_BACK){ toast('Back disabled'); return; } if(!hist.length){ toast('No history'); return; } const prev=hist.pop(); load(prev); try { updateFsBtn && updateFsBtn(); } catch(e){} };
    reset.onclick=()=>{ clicks=0; hist=[]; load(START); try { updateFsBtn && updateFsBtn(); } catch(e){} };
    // load(START) will be called after correct password entry
  })();

  // Stage 5 Boarding Pass (IATA)
  const s5=await J('config/stage5_boarding.json');
  const boardingV=addView('boarding','Boarding Pass'); (function(){
    const row=document.createElement('div'); const img=new Image(); img.className='passimg'; img.src=s5.asset;
    const form=document.createElement('div'); form.innerHTML=`<div class="hint">Enter 3-letter IATA code</div><input id="iata" maxlength="3" style="text-transform:uppercase;padding:10px;border-radius:10px;border:1px solid var(--line);background:#111;color:#fff"/><button class="btn" id="sub">Submit</button><div class="hint">${s5.from} → ${s5.to} • ${s5.date}</div>`;
    row.style.display='grid'; row.style.gap='16px'; boardingV.body.appendChild(row); row.appendChild(img); row.appendChild(form);
    form.querySelector('#sub').onclick=()=>{ const v=(form.querySelector('#iata').value||'').toUpperCase(); if(v===(s5.iataAnswer||'').toUpperCase()){ state.boarding=true; persist(); toast('✔ Correct — code found.'); FX.play('success'); open('briefcase'); } else { toast('Nope.'); FX.play('fail'); } };
  })();

  // Stage 6 Briefcase (locked by IATA)
  const briefV=addView('briefcase','Briefcase'); (function(){
    // Canvas
    const wrap=document.createElement('div');
    Object.assign(wrap.style,{
      position:'relative',
      minHeight:'60vh',
      display:'grid',
      placeItems:'center',
      background:'#000'
    });

    // Briefcase image (closed or open depending on state)
    const img=new Image();
    img.alt='Briefcase';
    Object.assign(img.style,{
      maxWidth:'min(95vw,1100px)',
      maxHeight:'70vh',
      width:'auto',
      height:'auto',
      objectFit:'contain',
      borderRadius:'12px',
      boxShadow:'0 20px 60px rgba(0,0,0,.6)'
    });
    wrap.appendChild(img);

    // Input overlay for lock code (ZTH or config iataAnswer)
    const bar=document.createElement('div');
    Object.assign(bar.style,{
      position:'absolute',
      left:'0', right:'0', bottom:'0',
      display:'grid',
      gridTemplateColumns:'auto 140px auto',
      gap:'8px',
      padding:'12px',
      alignItems:'center',
      background:'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4), transparent)'
    });
    bar.innerHTML = `
      <label style="color:#bbb;">Enter 3-letter code</label>
      <input id="bc" maxlength="3" style="text-transform:uppercase;padding:10px;border-radius:10px;border:1px solid var(--line);background:#111;color:#fff"/>
      <button class="btn" id="go">Unlock</button>
      <div class="hint" id="msg" style="grid-column: 1 / -1;"></div>
    `;
    wrap.appendChild(bar);
    briefV.body.appendChild(wrap);

    function showClosed(){
      img.src='assets/briefcase/briefcase.png';
      bar.style.display='';
    }
    function showOpen(){
      img.src='assets/briefcase/briefcaseopen.png';
      bar.style.display='none';
    }

    // Persistent state for opened briefcase
    if (state.briefOpen) showOpen(); else showClosed();
    // Ensure correct art on each view entry
    briefV.onshow = () => { if (state.briefOpen) showOpen(); else showClosed(); };

    // Unlock handler
    bar.querySelector('#go').onclick = async ()=>{
      const v=(bar.querySelector('#bc').value||'').trim().toUpperCase();
      const msg=bar.querySelector('#msg');
      const answer = ((typeof s5!=='undefined' && s5.iataAnswer) ? String(s5.iataAnswer) : 'ZTH').toUpperCase();
      if(v===answer){
        FX.play('unlock');
        // Play opening video, then set permanent open state
        try{
          const overlay=document.createElement('div');
          Object.assign(overlay.style,{position:'fixed',inset:'0',background:'#000e',display:'grid',placeItems:'center',zIndex:'99999'});
          const vid=document.createElement('video');
          vid.src='assets/briefcase/briefcaseopening.mp4';
          vid.autoplay=true;
          vid.controls=false;
          vid.playsInline=true;
          Object.assign(vid.style,{maxWidth:'min(95vw,1100px)',maxHeight:'80vh',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,.6)'});
          overlay.appendChild(vid); document.body.appendChild(overlay);
          const end=()=>{ try{ overlay.remove(); }catch(e){} state.briefOpen=true; persist(); showOpen(); toast('Briefcase opened.'); };
          vid.addEventListener('ended', end);
          vid.addEventListener('error', end);
          await vid.play().catch(()=>end());
        } catch(e){
          state.briefOpen=true; persist(); showOpen();
        }
      } else {
        msg.textContent='Wrong code.';
        FX.play('fail');
      }
    };
  })();

  // Stage 6 Shopping list
  const s6=await J('config/stage6_shopping.json'); const shopV=addView('shopping','Fridge Note'); (function(){
    const note=document.createElement('div'); note.className='note'; note.innerHTML=`<h3>${s6.riddle}</h3><ol>${s6.items.map(x=>`<li>${x}</li>`).join('')}</ol><div class="hint">Enter the word hidden at the end of each item.</div>`;
    const row=document.createElement('div'); row.style.marginTop='12px';
    row.innerHTML=`<input id="ans" placeholder="Answer" style="text-transform:uppercase;padding:10px;border-radius:10px;border:1px solid var(--line);background:#111;color:#fff"/> <button class="btn" id="ok">Submit</button>`;
    shopV.body.appendChild(note); shopV.body.appendChild(row);
    row.querySelector('#ok').onclick=()=>{ const v=(row.querySelector('#ans').value||'').trim().toLowerCase(); if(v===String(s6.finalWord||'').toLowerCase()){ state.phoneReady=true; persist(); toast('✔ Notebook solved — phone unlocked.'); FX.play('success'); open('phone'); } else { toast('Not quite.'); FX.play('fail'); } };
  })();

  // Stage 7 Phone (emoji sequence)
  const s7=await J('config/stage7_emojis.json'); const phoneV=addView('phone','Phone'); (function(){
    const phone=document.createElement('div'); phone.className='phone';
    // Phone shell and screen overlay (like laptop)
    const wrapP=document.createElement('div');
    wrapP.style.display='grid';
    wrapP.style.placeItems='center';
    const shellP=document.createElement('div');
    shellP.style.position='relative';
    shellP.style.width='min(65vw,480px)';
    shellP.style.maxWidth='480px';
    const artP=new Image();
    artP.src='assets/phone/phone.png';
    artP.alt='phone';
    Object.assign(artP.style,{width:'100%',height:'auto',display:'block',filter:'drop-shadow(0 20px 40px rgba(0,0,0,.6))'});
    artP.onerror=()=>{ artP.alt='assets/phone/phone.png not found — add your PNG'; };
    shellP.appendChild(artP);
    const scrP = (s7 && s7.screen) || { left: 7, top: 5.5, width: 87, height: 90.5 };
    function pctP(v){ return (v!=null && String(v).endsWith('%'))? String(v) : String(v)+'%'; }
    const screenP=document.createElement('div');
Object.assign(screenP.style,{
  position:'absolute',
  left: pctP(scrP.left), top: pctP(scrP.top),
  width: pctP(scrP.width), height: pctP(scrP.height),
  display:'grid', placeItems:'stretch',
  overflow:'hidden', borderRadius:'24px',
  background:'#000' // ensure full phone screen area is solid black behind all content
});
    if (document.body.classList.contains('debug')) screenP.style.outline='1px dashed rgba(0,255,255,.6)';
    shellP.appendChild(screenP);
    wrapP.appendChild(shellP);

    // Debug calibrator for phone screen overlay (use ?debug)
    if (document.body.classList.contains('debug')) {
      const rectP = { left: scrP.left, top: scrP.top, width: scrP.width, height: scrP.height };
      function applyRectP() {
        screenP.style.left = pctP(rectP.left);
        screenP.style.top = pctP(rectP.top);
        screenP.style.width = pctP(rectP.width);
        screenP.style.height = pctP(rectP.height);
      }
      const panelP = document.createElement('div');
      Object.assign(panelP.style, {
        position:'absolute', left:'8px', top:'8px', zIndex:20,
        background:'#000c', border:'1px solid #ffffff33', padding:'8px',
        borderRadius:'10px', display:'grid', gap:'6px', color:'#ddd', fontSize:'12px'
      });
      const readout = document.createElement('div');
      function updateReadout(){ readout.textContent = `L:${rectP.left.toFixed(1)} T:${rectP.top.toFixed(1)} W:${rectP.width.toFixed(1)} H:${rectP.height.toFixed(1)}`; }
      updateReadout();
      const mkRow = (label, key, delta=0.5) => {
        const row = document.createElement('div');
        row.style.display='flex'; row.style.gap='4px'; row.style.alignItems='center';
        const lab = document.createElement('span'); lab.textContent = label;
        const minus = document.createElement('button'); minus.className='btn'; minus.textContent='-';
        const plus = document.createElement('button'); plus.className='btn'; plus.textContent='+';
        minus.onclick=()=>{ rectP[key]-=delta; applyRectP(); updateReadout(); };
        plus.onclick=()=>{ rectP[key]+=delta; applyRectP(); updateReadout(); };
        row.appendChild(lab); row.appendChild(minus); row.appendChild(plus);
        return row;
      };
      const copyBtn = document.createElement('button'); copyBtn.className='btn'; copyBtn.textContent='Copy rect to console';
      copyBtn.onclick=()=>{ console.log('Phone screen rect for config/stage7_emojis.json → "screen":', JSON.stringify(rectP)); try { toast('Phone rect logged to console'); } catch(e){} };
      panelP.appendChild(readout);
      panelP.appendChild(mkRow('Left', 'left'));
      panelP.appendChild(mkRow('Top', 'top'));
      panelP.appendChild(mkRow('Width', 'width'));
      panelP.appendChild(mkRow('Height', 'height'));
      panelP.appendChild(copyBtn);
      shellP.appendChild(panelP);
      // Apply once in case defaults changed
      applyRectP();
    }
    // Step 1: Passcode
    // iPhone-like lock screen (time/date + pass input)
    const passWrap=document.createElement('div');
Object.assign(passWrap.style,{
  width:'100%',height:'100%',display:'flex',justifyContent:'center',alignItems:'center',
  background:'#000',
  textAlign:'center',
  position:'relative'
});
    const lockUIp=document.createElement('div');
    Object.assign(lockUIp.style,{
      display:'grid',
      gap:'12px',
      placeItems:'center',
      placeContent:'center',
      justifyItems:'center',
      alignContent:'center',
      width:'100%',
      height:'100%'
    });
    const timeElp=document.createElement('div');
    Object.assign(timeElp.style,{fontSize:'48px',fontWeight:'600',color:'#fff',textShadow:'0 3px 12px rgba(0,0,0,.5)'});
    const dateElp=document.createElement('div');
    Object.assign(dateElp.style,{fontSize:'14px',color:'#e6eefc',opacity:'0.9'});
    const pwRow=document.createElement('div');
    pwRow.style.display='flex'; pwRow.style.gap='8px'; pwRow.style.alignItems='center'; pwRow.style.justifyContent='center'; pwRow.style.marginTop='8px';
    const pwInputP=document.createElement('input'); pwInputP.id='ph-pass'; pwInputP.type='password';
    Object.assign(pwInputP.style,{
      width:'220px',height:'28px',background:'#fff',color:'#000',
      border:'none',borderRadius:'6px',padding:'0 10px',outline:'none',
      textTransform:'uppercase',boxShadow:'0 6px 18px rgba(0,0,0,.25)'
    });
    const unlockP=document.createElement('button'); unlockP.className='btn'; unlockP.textContent='Unlock';
    pwRow.appendChild(pwInputP); pwRow.appendChild(unlockP);
    lockUIp.appendChild(timeElp); lockUIp.appendChild(dateElp); lockUIp.appendChild(pwRow);
    passWrap.appendChild(lockUIp);
    function updClockP(){
      const d=new Date();
      timeElp.textContent = String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
      try { dateElp.textContent = d.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' }); } catch {}
    }
    updClockP(); setInterval(updClockP,30000);

    // Responsive sizing for lock UI inside the phone screen
    
    // Step 2/3: Video (full screen) → Emoji puzzle with clue + replay
    // Selection and keyboard
    const bubble=document.createElement('div'); bubble.className='bubble';
    const kb=document.createElement('div'); kb.className='kb';
    const chosen=[]; function render(){ bubble.textContent=chosen.join(' '); }
    const pool=(s7.sequence||[]).concat(s7.decoys||[]); if(s7.randomizeKeyboard) pool.sort(()=>Math.random()-0.5);
    pool.forEach(e=>{ const b=document.createElement('button'); b.textContent=e; b.onclick=()=>{ chosen.push(e); render(); }; kb.appendChild(b); });
    function sizeEmojiButtons(){
      const w = screenP.clientWidth || 320;
      const h = screenP.clientHeight || 480;
      const base = Math.min(w,h);
      const fs = Math.round(Math.max(18, Math.min(28, base*0.08)));
      const pad = Math.round(Math.max(6, Math.min(10, base*0.025)));
      kb.querySelectorAll('button').forEach(btn=>{
        btn.style.fontSize = fs + 'px';
        btn.style.padding = pad + 'px';
      });
    }
    sizeEmojiButtons();
    window.addEventListener('resize', sizeEmojiButtons);
    const bar=document.createElement('div'); 
    const clear=document.createElement('button'); clear.className='btn'; clear.textContent='Clear'; clear.onclick=()=>{ chosen.length=0; render(); };
    const submit=document.createElement('button'); submit.className='btn'; submit.textContent='Submit'; 
    submit.onclick=()=>{ 
      const ok=chosen.join(',')===(s7.sequence||[]).join(','); 
      if(ok){ 
        state.phone=true; persist(); 
        toast('✔ Correct — text thread unlocked.'); FX.play('success'); 
        // Show the chat riddle view inside the phone
        try { videoWrap.style.display='none'; puzzleWrap.style.display='none'; } catch(e){}
        content.style.display='grid';
        chatWrap.style.display='grid';
      } else { 
        toast('Not quite — try again.'); FX.play('fail'); 
        if(!s7.keepOnWrong){ chosen.length=0; render(); } 
      } 
    };
    bar.appendChild(clear); bar.appendChild(submit);

    // Video view (fills the phone screen crop)
    const videoWrap=document.createElement('div');
    Object.assign(videoWrap.style,{ width:'100%', height:'100%', position:'relative', display:'none' });
    const vid=document.createElement('video'); 
    vid.src=s7.video; vid.controls=true; 
    Object.assign(vid.style,{ width:'100%', height:'100%', objectFit:'cover', display:'block' });
    videoWrap.appendChild(vid);

    // Puzzle view (clue message + emoji keyboard + selected sequence + replay)
    const puzzleWrap=document.createElement('div');
    Object.assign(puzzleWrap.style,{ width:'100%', height:'100%', display:'grid', position:'relative', padding:'10px', boxSizing:'border-box', overflow:'hidden', gridTemplateRows:'auto auto 1fr auto' });
    // Clue as chat bubble
    const clueMsg=document.createElement('div');
    clueMsg.textContent = String(s7.hint || 'Watch the moods flow, scene by scene. Tap each emoji in the feelings routine.');
    Object.assign(clueMsg.style,{
      background:'#1b1b1b', color:'#fff', padding:'10px 12px', borderRadius:'12px',
      maxWidth:'90%', margin:'6px 0', boxShadow:'0 6px 16px rgba(0,0,0,.25)'
    });
    // Selected sequence bubble
    Object.assign(bubble.style,{
      background:'#0f0f0f', color:'#fff', padding:'8px 10px', borderRadius:'10px',
      minHeight:'36px', display:'flex', alignItems:'center', gap:'6px', margin:'6px 0'
    });
    // Keyboard grid
    Object.assign(kb.style,{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'8px', marginTop:'8px' });

    // Replay button (top-right)
    const replay=document.createElement('button'); 
    replay.className='btn'; replay.textContent='Replay video';
    Object.assign(replay.style,{ position:'sticky', top:'8px', justifySelf:'end', zIndex:'2' });
    replay.onclick=()=>showVideo();

    puzzleWrap.appendChild(replay);
    puzzleWrap.appendChild(clueMsg);
    puzzleWrap.appendChild(bubble);
    puzzleWrap.appendChild(kb);
    puzzleWrap.appendChild(bar);

    // Content container holds both views (we toggle between them)
    const content=document.createElement('div');
    Object.assign(content.style,{ width:'100%', height:'100%', display:'none', placeItems:'stretch', position:'relative' });
    content.appendChild(videoWrap);
    content.appendChild(puzzleWrap);
    // Chat reveal view after correct emoji sequence
    const chatWrap=document.createElement('div');
    Object.assign(chatWrap.style,{
      width:'100%',
      height:'100%',
      display:'none',
      padding:'10px',
      boxSizing:'border-box',
      background:'#0b0b0b',
      color:'#fff',
      gridTemplateRows:'auto 1fr auto',
      gap:'8px'
    });
    const chatHeader=document.createElement('div');
    chatHeader.textContent='New message';
    Object.assign(chatHeader.style,{ opacity:0.8, fontSize:'14px' });
    const chatBody=document.createElement('div');
    Object.assign(chatBody.style,{ alignSelf:'start' });
    const bubbleRiddle=document.createElement('div');
    bubbleRiddle.textContent="Rex said that Richie was lying. Richie said that Rudy was lying. Rudy said that Richie and Rex were lying. Who's telling the truth?";
    Object.assign(bubbleRiddle.style,{ background:'#1b1b1b', padding:'12px', borderRadius:'12px', boxShadow:'0 6px 16px rgba(0,0,0,.25)' });
    chatBody.appendChild(bubbleRiddle);
    chatWrap.appendChild(chatHeader);
    chatWrap.appendChild(chatBody);
    content.appendChild(chatWrap);

    // View helpers
    function showVideo(){
      puzzleWrap.style.display='none';
      videoWrap.style.display='';
      try { vid.currentTime = 0; vid.play().catch(()=>{}); } catch(e){}
    }
    function showPuzzle(){
      try { vid.pause(); } catch(e){}
      videoWrap.style.display='none';
      puzzleWrap.style.display='';
    }

    // When video finishes, auto-show the puzzle
    vid.addEventListener('ended', showPuzzle);

    // Unlock action
    const doPhoneUnlock=()=>{ 
      const v=(pwInputP.value||'').trim().toLowerCase(); 
      if(v===String(s7.phonePasscode||'').toLowerCase()){ 
        toast('Phone unlocked.'); FX.play('unlock'); 
        passWrap.style.display='none'; 
        content.style.display='grid';
        showVideo(); // start with full-screen video, then transition to puzzle on end
      } else { 
        toast('Wrong code.'); FX.play('fail'); 
      } 
    };
    unlockP.onclick=doPhoneUnlock;
    pwInputP.addEventListener('keydown', e=>{ if(e.key==='Enter') doPhoneUnlock(); });

    // Mount into phone screen overlay and show
    screenP.appendChild(passWrap); screenP.appendChild(content); phoneV.body.appendChild(wrapP);
    // Ensure layout computes after view becomes visible
    phoneV.onshow = () => { try { typeof sizeEmojiButtons==='function' && sizeEmojiButtons(); } catch(e){} };
  })();

  // Stage 8 Portraits → Stage 9 Crossword
  const s8=await J('config/stage8_riddle.json'); const s9=await J('config/stage9_crossword.json'); const portraitsV=addView('portraits','Portraits'); (function(){
    // Background wrap with wall image; portraits will be absolutely positioned overlays
    const wrap=document.createElement('div');
    Object.assign(wrap.style,{
      position:'relative',
      width:'100%',
      minHeight:'60vh',
      backgroundImage:'url(assets/portraits/portraits.jpg)',
      backgroundSize:'cover',
      backgroundPosition:'center',
      overflow:'hidden'
    });

    const truthful=s8.portraits.findIndex(p=>p.isTruthful);

    function applyPos(el, pos, idx){
      if (pos && typeof pos.left==='number' && typeof pos.top==='number') {
        el.style.left = pos.left + '%';
        el.style.top = pos.top + '%';
        if (typeof pos.width==='number') el.style.width = pos.width + '%';
        if (typeof pos.height==='number') el.style.height = pos.height + '%';
      } else {
        // Fallback approximate layout: 3 portraits horizontally, centered
        const W=18, H=30, GAP=6;
        const left = 50 - (1.5*W + GAP) + idx*(W+GAP);
        el.style.left = left + '%';
        el.style.top = '30%';
        el.style.width = W + '%';
        el.style.height = H + '%';
      }
    }

    const cards=[];
    s8.portraits.forEach((p,i)=>{
      const card=document.createElement('button');
      card.className='por';
      Object.assign(card.style,{ position:'absolute', border:'none', padding:'0', background:'transparent', cursor:'pointer', transformStyle:'preserve-3d' });

      const img=new Image();
      img.src=p.file;
      Object.assign(img.style,{ width:'100%', height:'100%', objectFit:'cover', display:'block', boxShadow:'0 10px 30px rgba(0,0,0,.35)', borderRadius:'6px' });
      card.appendChild(img);

      // Apply configured position if provided: p.pos = { left, top, width, height } (percentages)
      applyPos(card, p.pos, i);

      card.onclick=()=>{
        if(i===truthful){
          state.portraits=true; persist();
          FX.play('success');
          try {
            card.style.transformOrigin='center';
            card.style.transition='transform .5s';
            card.style.transform='rotateY(180deg)';
          } catch(e){}
          setTimeout(()=>open('crossword'), 520);
        } else {
          FX.play('fail');
        }
      };

      wrap.appendChild(card);
      cards.push({ card, i, p });
    });

    // Debug: allow dragging and copying positions to console for calibration
    if (document.body.classList.contains('debug')) {
      let dragging=null, start=null, wrapRect=null;
      function toPct(px, total){ return Math.max(0, Math.min(100, (px/total)*100)); }
      wrap.addEventListener('mousedown', e=>{
        const el=e.target.closest('button.por'); if(!el) return;
        wrapRect=wrap.getBoundingClientRect();
        const idx=cards.findIndex(c=>c.card===el);
        if (idx<0) return;
        const r=el.getBoundingClientRect();
        dragging={ el, idx, offX:e.clientX - r.left, offY:e.clientY - r.top, w:r.width, h:r.height };
        e.preventDefault();
      });
      window.addEventListener('mousemove', e=>{
        if(!dragging) return;
        const x = e.clientX - wrapRect.left - dragging.offX;
        const y = e.clientY - wrapRect.top - dragging.offY;
        const leftPct = toPct(x, wrapRect.width);
        const topPct  = toPct(y, wrapRect.height);
        dragging.el.style.left = leftPct + '%';
        dragging.el.style.top  = topPct + '%';
      });
      window.addEventListener('mouseup', ()=>{
        if(!dragging) return;
        dragging=null;
      });

      const panel=document.createElement('div');
      Object.assign(panel.style,{ position:'absolute', left:'8px', top:'8px', background:'#000c', color:'#ddd', padding:'8px', border:'1px solid #ffffff33', borderRadius:'10px', display:'grid', gap:'6px', zIndex:5, fontSize:'12px', maxWidth:'50%' });

      let selectedIdx = -1;
      function getRectPct(el){
        const r = el.getBoundingClientRect();
        const wr = wrap.getBoundingClientRect();
        const left = toPct(r.left - wr.left, wr.width);
        const top  = toPct(r.top  - wr.top,  wr.height);
        const width = toPct(r.width, wr.width);
        const height= toPct(r.height,wr.height);
        return { left, top, width, height };
      }
      function selectCard(idx){
        selectedIdx = idx;
        cards.forEach((c,i)=>{ c.card.style.outline = (i===selectedIdx)? '2px dashed #5cf' : ''; });
        updateReadout();
      }
      function updateReadout(){
        if(selectedIdx<0){ readoutSel.textContent = 'No selection'; return; }
        const { card } = cards[selectedIdx];
        const r = getRectPct(card);
        readoutSel.textContent = `Selected: ${cards[selectedIdx].p.file} • L:${r.left.toFixed(2)} T:${r.top.toFixed(2)} W:${r.width.toFixed(2)} H:${r.height.toFixed(2)}`;
      }
      function nudgeSize(dw=0, dh=0){
        if(selectedIdx<0) return;
        const { card } = cards[selectedIdx];
        const wr = wrap.getBoundingClientRect();
        const r = card.getBoundingClientRect();
        const curW = toPct(r.width, wr.width);
        const curH = toPct(r.height, wr.height);
        const newW = Math.max(1, Math.min(100, curW + dw));
        const newH = Math.max(1, Math.min(100, curH + dh));
        card.style.width = newW + '%';
        card.style.height = newH + '%';
        updateReadout();
      }
      function writeClipboard(txt){
        try { navigator.clipboard.writeText(txt); toast('Copied to clipboard'); } catch(e) { console.log('Clipboard error', e); }
      }

      // Click to select (in addition to drag)
      wrap.addEventListener('click', e=>{
        const el=e.target.closest('button.por'); 
        if(!el) return;
        const idx=cards.findIndex(c=>c.card===el);
        if (idx>-1) selectCard(idx);
      }, true);

      const readoutSel = document.createElement('div');
      readoutSel.style.opacity='0.9';
      readoutSel.textContent='No selection';

      // Resize controls
      const resizeRow = document.createElement('div');
      resizeRow.style.display='flex';
      resizeRow.style.gap='6px';
      const wMinus = document.createElement('button'); wMinus.className='btn'; wMinus.textContent='W-';
      const wPlus  = document.createElement('button'); wPlus.className='btn'; wPlus.textContent='W+';
      const hMinus = document.createElement('button'); hMinus.className='btn'; hMinus.textContent='H-';
      const hPlus  = document.createElement('button'); hPlus.className='btn'; hPlus.textContent='H+';
      wMinus.onclick=()=>nudgeSize(-0.5,0);
      wPlus.onclick =()=>nudgeSize(+0.5,0);
      hMinus.onclick=()=>nudgeSize(0,-0.5);
      hPlus.onclick =()=>nudgeSize(0,+0.5);
      resizeRow.appendChild(wMinus); resizeRow.appendChild(wPlus); resizeRow.appendChild(hMinus); resizeRow.appendChild(hPlus);

      const copySel = document.createElement('button'); copySel.className='btn'; copySel.textContent='Copy selected';
      copySel.onclick=()=>{
        if(selectedIdx<0) return;
        const { card, p } = cards[selectedIdx];
        const r = getRectPct(card);
        const out = { file: p.file, pos: { left:+r.left.toFixed(2), top:+r.top.toFixed(2), width:+r.width.toFixed(2), height:+r.height.toFixed(2) }, isTruthful: !!p.isTruthful };
        const txt = JSON.stringify(out, null, 2);
        console.log('--- Selected portrait pos:', txt);
        writeClipboard(txt);
      };

      const copyAll = document.createElement('button'); copyAll.className='btn'; copyAll.textContent='Copy all';
      copyAll.onclick=()=>{
        const out = cards.map(({card,p})=>{
          const r = getRectPct(card);
          return { file: p.file, pos: { left:+r.left.toFixed(2), top:+r.top.toFixed(2), width:+r.width.toFixed(2), height:+r.height.toFixed(2) }, isTruthful: !!p.isTruthful };
        });
        const txt = JSON.stringify(out, null, 2);
        console.log('--- Paste into config/stage8_riddle.json portraits[].pos:', txt);
        writeClipboard(txt);
      };

      panel.appendChild(readoutSel);
      panel.appendChild(resizeRow);
      panel.appendChild(copySel);
      panel.appendChild(copyAll);
      wrap.appendChild(panel);
    }

    portraitsV.body.innerHTML=''; // clear any previous
    portraitsV.body.appendChild(wrap);
  })();
  const crossV=addView('crossword','Crossword'); (function(){
    // Helper: play pre-envelope video, then open final letter view
    function showEnvelopeThenFinal(){
      const src = 'assets/final/envelope.mp4';
      try {
        const overlay=document.createElement('div');
        Object.assign(overlay.style,{ position:'fixed', inset:'0', background:'#000e', display:'grid', placeItems:'center', zIndex:'99999' });
        const vid=document.createElement('video');
        vid.src = src;
        vid.autoplay = true;
        vid.controls = false;
        vid.playsInline = true;
        Object.assign(vid.style,{ maxWidth:'min(95vw,1100px)', maxHeight:'80vh', borderRadius:'12px', boxShadow:'0 20px 60px rgba(0,0,0,.6)' });
        overlay.appendChild(vid); document.body.appendChild(overlay);
        const end=()=>{ try{ overlay.remove(); }catch(e){} open('finale'); };
        vid.addEventListener('ended', end);
        vid.addEventListener('error', end);
        vid.play().catch(()=>end());
      } catch {
        open('finale');
      }
    }

    // External embed mode (optional via config/stage9_crossword.json):
    // Set "embedUrl" to a playable crossword URL (same-origin or with appropriate CORS), optionally:
    // "messageSolved": "CROSSWORD_SOLVED" so the iframe can postMessage that string to mark success
    // "allowManual": true to show a manual Continue button for testing/backup
    // Prefer external embed if provided; otherwise fall back to local drop-in page
    const url = (s9 && s9.embedUrl && s9.embedUrl.trim()) || 'assets/crossword/local.html';
    if (url) {
      const wrap = document.createElement('div');
      Object.assign(wrap.style,{
        position:'relative',
        background:'#000',
        borderRadius:'12px',
        overflow:'hidden',
        boxShadow:'0 20px 60px rgba(0,0,0,.6)',
        margin:'0 auto'
      });
      // Responsive 16:9 sizing that fits inside the view's content area, scaled down to ensure headroom
      function sizeWrap(){
        // Measure the available space inside this view's main area
        const host = crossV.body;
        const r = host.getBoundingClientRect();
        // Also account for toolbar height above the body
        const headH = (crossV && crossV.head) ? Math.ceil(crossV.head.getBoundingClientRect().height) : 0;
        // Safety scale to keep content smaller than the available box
        const SAFETY = 0.82; // shrink everything so it comfortably fits
        // Target width limited by host width and a conservative max cap
        const wTarget = Math.min(r.width, 1000);
        // Height cap is viewport height minus head + small padding, and host box height
        const hViewportCap = Math.max(0, Math.floor(window.innerHeight - headH - 24));
        const hHostCap = Math.max(0, Math.floor(r.height - 12));
        const hMax = Math.min(hViewportCap, hHostCap);
        // Compute 16:9 from width; clamp by available height
        const hFromW = Math.floor(wTarget * 9/16);
        let h = Math.min(hMax, hFromW);
        let w = Math.floor(h * 16/9);
        // Apply safety scaling
        h = Math.floor(h * SAFETY);
        w = Math.floor(w * SAFETY);
        // If host is extremely narrow/tall, fallback to width-constrained sizing
        if (h <= 0 || w <= 0) {
          const hAltMax = Math.max(0, Math.min(hViewportCap, hHostCap));
          const wAltFromH = Math.floor(hAltMax * 16/9);
          const wAlt = Math.min(r.width, wAltFromH);
          wrap.style.width = Math.max(0, Math.floor(wAlt * SAFETY)) + 'px';
          wrap.style.height = Math.max(0, Math.floor(hAltMax * SAFETY)) + 'px';
        } else {
          wrap.style.width = w + 'px';
          wrap.style.height = h + 'px';
        }
      }
      sizeWrap();
      // Resize when window or host resizes
      window.addEventListener('resize', sizeWrap);
      try { new ResizeObserver(()=>sizeWrap()).observe(crossV.body); } catch(_) {}

      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.allow = 'fullscreen; autoplay';
      iframe.referrerPolicy = 'no-referrer';
      Object.assign(iframe.style,{ width:'100%', height:'100%', display:'block', border:'none', background:'#fff' });
      wrap.appendChild(iframe);

      // Listen for a postMessage from the embedded crossword to mark success
      try {
        if (s9.messageSolved) {
          window.addEventListener('message', (e)=>{
            try {
              const msg = typeof e.data==='string' ? e.data : (e.data && e.data.type);
              if (msg === s9.messageSolved) {
                FX.play('success');
                showEnvelopeThenFinal();
              }
            } catch(_) {}
          });
        }
      } catch(_) {}

      // Optional manual continue button (useful during dev)
      if (s9 && s9.allowManual) {
        const btn = document.createElement('button');
        btn.className='btn';
        btn.textContent='Continue';
        Object.assign(btn.style,{ position:'absolute', right:'10px', bottom:'10px' });
        btn.onclick=()=>{ FX.play('success'); open('finale'); };
        wrap.appendChild(btn);
      }

      crossV.body.innerHTML='';
      crossV.body.appendChild(wrap);
      return; // Skip internal crossword grid when embed is used
    }
    const colIndex=2; // use s9 that was already loaded above
    const maxLen=Math.max(...s9.clues.map(c=>c.answer.length));
    const grid=document.createElement('div'); grid.className='grid'; grid.style.gridTemplateColumns=`repeat(${maxLen},34px)`; const answers=[];
    s9.clues.forEach((c,row)=>{ const ans=c.answer.toUpperCase(); answers[row]=new Array(maxLen).fill(''); for(let i=0;i<maxLen;i++){ const cell=document.createElement('div'); cell.className='cell'; if(i<ans.length){ cell.contentEditable='true'; cell.oninput=()=>{ cell.textContent=cell.textContent.toUpperCase().slice(0,1); answers[row][i]=cell.textContent; }; } if(i===colIndex) cell.classList.add('shaded'); grid.appendChild(cell); } });
    const clues=document.createElement('div'); clues.className='clues'; clues.innerHTML=`<div class="hint">${s9.hint}</div><ol>${s9.clues.map(c=>`<li>${c.text}</li>`).join('')}</ol>`;
    const row=document.createElement('div'); row.appendChild(grid); row.appendChild(clues); row.style.display='grid'; row.style.gridTemplateColumns='auto 1fr'; row.style.gap='16px';
    const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Check'; btn.onclick=()=>{ const ok=s9.clues.every((c,r)=> c.answer.toUpperCase()===answers[r].join('').slice(0,c.answer.length)); if(ok){ const down=s9.clues.map((c,r)=>(c.answer[colIndex]||'')).join('').toUpperCase(); toast('Down word: '+down); if(down===(s9.downWord||'').toUpperCase()) { FX.play('success'); showEnvelopeThenFinal(); } } else { toast('Some across answers are incorrect.'); FX.play('fail'); } };
    crossV.body.appendChild(row); crossV.body.appendChild(btn);
  })();

  // Stage 11 Finale
  const s11=await J('config/stage11_finale.json'); const finV=addView('finale','Final Envelope'); (function(){
    const prose=document.createElement('div'); const strip=document.createElement('div'); strip.className='strip'; const hint=document.createElement('div'); if(s11.ui?.showHintLine) hint.textContent=s11.ui.hintText;
    let chosen=[];
    s11.paragraphs.forEach(p=>{
      const para = document.createElement('p');
      // Split on whitespace using a safe regex literal
      p.split(/(\s+)/).forEach(tok => {
        if (/\s+/.test(tok)) {
          para.appendChild(document.createTextNode(tok));
        } else {
          // Clean leading/trailing non-word characters using conservative ASCII class and keep common quotes
          const clean = tok
            .replace(/^[^A-Za-z0-9_'’]+/, '')
            .replace(/[^A-Za-z0-9_'  ]+$/, '');
          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = tok;
          span.dataset.clean = (clean || tok).toLowerCase();
          span.onclick = () => {
            span.classList.toggle('selected');
            if (span.classList.contains('selected')) {
              chosen.push(span.dataset.clean);
            } else {
              const i = chosen.lastIndexOf(span.dataset.clean);
              if (i > -1) chosen.splice(i, 1);
            }
            strip.textContent = chosen.join(' ');
          };
          para.appendChild(span);
        }
      });
      prose.appendChild(para);
    });
    const bar=document.createElement('div'); const clear=document.createElement('button'); clear.className='btn'; clear.textContent='Clear'; const submit=document.createElement('button'); submit.className='btn'; submit.textContent='Submit'; const key=document.createElement('div'); key.className='key'; key.textContent='🗝 Key drops. The door unlocks.'; key.style.display='none';
    clear.onclick=()=>{ chosen.length=0; strip.textContent=''; document.querySelectorAll('.word.selected').forEach(w=>w.classList.remove('selected')); };
    submit.onclick=()=>{
      function norm(s){
        if(!s) return '';
        return String(s)
          .toLowerCase()
          .replace(/[’]/g,"'")           // normalize smart apostrophes
          .replace(/[^a-z0-9' ]+/g,' ')  // drop other punctuation
          .replace(/\s+/g,' ')           // collapse spaces
          .trim();
      }
      // Build normalized strings for comparison
      const chosenStr = norm(chosen.join(' '));
      const seqStr = norm((s11.targetSequence || []).join(' '));
      const targetStr = norm(s11.targetString || seqStr);
      const ok = (chosen.length && chosenStr === targetStr);

      if(ok){
        // mark finale complete so the door hotspot opens
        state.finale = true;
        persist();

        // Play ending video, then go to the Escape Complete screen
        (function playEnding(){
          const src = 'assets/final/ending.mp4';
          try {
            const overlay=document.createElement('div');
            Object.assign(overlay.style,{ position:'fixed', inset:'0', background:'#000e', display:'grid', placeItems:'center', zIndex:'99999' });
            const vid=document.createElement('video');
            vid.src = src;
            vid.autoplay = true;
            vid.controls = false;
            vid.playsInline = true;
            Object.assign(vid.style,{ maxWidth:'min(95vw,1100px)', maxHeight:'80vh', borderRadius:'12px', boxShadow:'0 20px 60px rgba(0,0,0,.6)' });
            overlay.appendChild(vid); document.body.appendChild(overlay);
            const end=()=>{ try{ overlay.remove(); }catch(e){} open('end'); };
            vid.addEventListener('ended', end);
            vid.addEventListener('error', end);
            vid.play().catch(()=>end());
          } catch {
            open('end');
          }
        })();
      } else {
        toast('Not quite — look again.');
        FX.play('fail');
      }
    };
    bar.appendChild(clear); bar.appendChild(submit);

    // Handwritten note styling and layout
    const v=views['finale'];
    Object.assign(v.body.style,{
      display:'grid', placeItems:'start center', minHeight:'calc(100vh - 100px)',
      background:'radial-gradient(80% 60% at 50% 40%, rgba(255,230,190,0.12), transparent 60%), linear-gradient(180deg,#0b0b0b,#000)',
      paddingTop:'12px'
    });
    const paper=document.createElement('div');
    Object.assign(paper.style,{
      position:'relative',
      width:'min(92vw, 900px)',
      minHeight:'50vh',
      maxHeight:'min(78vh, calc(100vh - 140px))',
      padding:'28px 26px 18px',
      background:'#f5f1e6',
      color:'#2b2b2b',
      borderRadius:'12px',
      boxShadow:'0 20px 60px rgba(0,0,0,.55), inset 0 0 0 1px rgba(0,0,0,.06)',
      overflowY:'auto',
      backgroundImage:
        'radial-gradient(140% 100% at 50% 0%, rgba(0,0,0,0.08), rgba(0,0,0,0) 50%), ' + /* vignette */
        'repeating-linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.05) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 28px)' /* subtle paper lines */
    });
    // Handwritten-ish typography
    Object.assign(prose.style,{
      fontFamily:'"Segoe Script","Bradley Hand","Comic Sans MS",cursive',
      fontSize:'22px',
      lineHeight:'1.9',
      letterSpacing:'0.2px',
      filter:'contrast(0.98)',
      userSelect:'none'
    });
    Object.assign(strip.style,{
      marginTop:'10px',
      fontFamily:'"Segoe Script","Bradley Hand","Comic Sans MS",cursive',
      fontSize:'18px',
      color:'#5a513f',
      background:'rgba(0,0,0,0.06)',
      border:'1px solid rgba(0,0,0,0.08)',
      padding:'8px 10px',
      borderRadius:'8px'
    });
    Object.assign(bar.style,{ display:'flex', gap:'8px', marginTop:'12px' });

    paper.appendChild(hint);
    paper.appendChild(prose);
    paper.appendChild(strip);
    paper.appendChild(bar);
    v.body.appendChild(paper);
    v.body.appendChild(key);
  })();

  const endV=addView('end','Escape Complete'); (function(){
    // Scene container
    const scene=document.createElement('div');
    Object.assign(scene.style,{
      position:'relative',
      width:'100%',
      minHeight:'60vh',
      display:'grid',
      placeItems:'center',
      background:'radial-gradient(80% 60% at 50% 40%, rgba(255,255,255,0.06), transparent 60%), linear-gradient(180deg,#06080c,#0b0e14)',
      overflow:'hidden'
    });

    // Fireworks canvas
    const cvs=document.createElement('canvas');
    const ctx=cvs.getContext('2d');
    Object.assign(cvs.style,{ position:'absolute', inset:'0', width:'100%', height:'100%' });
    scene.appendChild(cvs);

    // Foreground UI
    const ui=document.createElement('div');
    Object.assign(ui.style,{
      position:'relative',
      zIndex:2,
      display:'grid',
      placeItems:'center',
      gap:'10px',
      padding:'20px'
    });
    const title=document.createElement('h1');
    title.textContent='Escape Complete!';
    Object.assign(title.style,{ color:'#fff', textShadow:'0 4px 18px rgba(0,0,0,.6)', margin:'0' });

    const sub=document.createElement('div');
    sub.className='hint';
    sub.textContent='The door swings open. Fireworks light up the sky.';
    Object.assign(sub.style,{ color:'#ccd2e0', textAlign:'center' });

    const controls=document.createElement('div');
    Object.assign(controls.style,{ display:'flex', gap:'8px', alignItems:'center', justifyContent:'center' });

    const restart=document.createElement('button');
    restart.className='btn';
    restart.textContent='Restart Now';

    const countdown=document.createElement('span');
    Object.assign(countdown.style,{ color:'#9bb0d0' });
    countdown.textContent='Auto-restart in 9s';

    controls.appendChild(restart);
    controls.appendChild(countdown);
    ui.appendChild(title);
    ui.appendChild(sub);
    ui.appendChild(controls);
    scene.appendChild(ui);
    endV.body.appendChild(scene);

    // Fireworks implementation
    function fit(){
      const r=endV.body.getBoundingClientRect();
      cvs.width = Math.max(1, Math.floor(r.width));
      cvs.height= Math.max(1, Math.floor(Math.max(r.height, window.innerHeight*0.6)));
    }
    fit();
    try { new ResizeObserver(fit).observe(endV.body); } catch(_) { window.addEventListener('resize', fit); }

    const particles=[];
    const gravity=0.06;
    const friction=0.992;

    function burst(x,y, power=4, count=90){
      for(let i=0;i<count;i++){
        const ang = Math.random()*Math.PI*2;
        const spd = (Math.random()*power)+(power*0.5);
        const hue = Math.floor(Math.random()*360);
        particles.push({
          x, y,
          vx: Math.cos(ang)*spd,
          vy: Math.sin(ang)*spd - 0.5,
          life: 60 + Math.random()*30,
          hue,
          size: 2 + Math.random()*2,
          alpha: 1
        });
      }
    }

    let ticker=0, running=true;
    function tick(){
      if(!running) return;
      ticker++;
      ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='rgba(0,0,0,0.15)';
      ctx.fillRect(0,0,cvs.width,cvs.height);
      ctx.globalCompositeOperation='lighter';

      // random bursts (less frequent over time)
      if (ticker % 22 === 0) {
        const padW = Math.floor(cvs.width*0.1);
        const padH = Math.floor(cvs.height*0.15);
        burst(padW + Math.random()*(cvs.width - padW*2),
              padH + Math.random()*(cvs.height*0.6 - padH),
              3.8 + Math.random()*1.6,
              60 + Math.floor(Math.random()*60));
      }

      // update particles
      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        p.vx*=friction; p.vy=(p.vy+gravity)*friction;
        p.x+=p.vx; p.y+=p.vy;
        p.life-=1;
        p.alpha=Math.max(0, p.life/80);
        ctx.beginPath();
        ctx.fillStyle=`hsla(${p.hue}, 90%, 60%, ${p.alpha})`;
        ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fill();
        if(p.life<=0 || p.alpha<=0 || p.x< -20 || p.x>cvs.width+20 || p.y>cvs.height+20){
          particles.splice(i,1);
        }
      }

      requestAnimationFrame(tick);
    }

    // Controls
    scene.addEventListener('click', (e)=>{
      const rect = cvs.getBoundingClientRect();
      burst(e.clientX - rect.left, e.clientY - rect.top, 5, 140);
    });

    const RESTART_AFTER_MS = 9000;
    let restartTimer = null;

    function doRestart(){
      try{ localStorage.removeItem('escapeState'); }catch(e){}
      try{ localStorage.removeItem('introDone'); }catch(e){}
      location.reload();
    }
    restart.onclick = ()=>{ 
      try { if (restartTimer) clearInterval(restartTimer); } catch(e){} 
      doRestart(); 
    };

    // Kickoff when shown
    endV.onshow = ()=>{
      try { FX.play('success'); } catch(e){}
      ticker=0; running=true; tick();

      // Start (or restart) the auto-restart countdown only when this view is visible
      let remain = Math.floor(RESTART_AFTER_MS/1000);
      countdown.textContent = `Auto-restart in ${remain}s`;
      try { if (restartTimer) clearInterval(restartTimer); } catch(e){}
      restartTimer = setInterval(()=>{
        remain -= 1;
        countdown.textContent = `Auto-restart in ${Math.max(0, remain)}s`;
        if (remain <= 0) {
          try { clearInterval(restartTimer); } catch(e){}
          doRestart();
        }
      }, 1000);
    };
  })();

  await room.init();
})();
