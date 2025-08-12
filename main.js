(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const startScreen = document.getElementById('startScreen');
  const btnStart = document.getElementById('btnStart');
  const betEl = document.getElementById('bet');
  const currencyEl = document.getElementById('currency');

  const hud = document.getElementById('hud');
  const multEl = document.getElementById('mult');
  const speedEl = document.getElementById('speed');
  const distEl = document.getElementById('dist');
  const finesEl = document.getElementById('fines');
  const timerEl = document.getElementById('timer');
  const modeEl = document.getElementById('mode');
  const btnWithdraw = document.getElementById('btnWithdraw');

  const overlay = document.getElementById('overlay');
  const ovTitle = document.getElementById('ovTitle');
  const ovMult = document.getElementById('ovMult');
  const ovDist = document.getElementById('ovDist');
  const ovWin = document.getElementById('ovWin');
  const btnPlayAgain = document.getElementById('btnPlayAgain');
  const btnBack = document.getElementById('btnBack');

  const LANE_COUNT = 3;
  let running = false, night = false, turbo = false;
  let fines = 0, multiplier = 1.00, speed = 0, distance = 0, timeClean = 0;
  let elapsed = 0, lane = 1;
  let betAmount = 100, betCurrency = 'USDT';

  const laneDepthZ = [0.6, 0.8, 1.0];
  let traffic = [], pedestrians = [], lights = [];
  let lastSpawn = 0;

  function resetGame(){
    running = false; night = false; turbo = false;
    fines = 0; multiplier = 1.00; speed = 0; distance = 0; timeClean = 0; elapsed = 0; lane = 1;
    traffic = []; pedestrians = []; lights = []; lastSpawn = 0;
    multEl.textContent = '1.00x'; speedEl.textContent = '0'; distEl.textContent = '0.00';
    finesEl.textContent = '0'; timerEl.textContent = '0.0'; modeEl.textContent = 'DAY';
    btnWithdraw.disabled = true;
  }

  function spawn(){
    if (!running) return;
    const now = performance.now();
    const gap = turbo ? 450 : 650;
    if (now - lastSpawn < gap) return;
    lastSpawn = now;
    const r = Math.random();
    if (r < 0.55){ // car
      const ln = Math.floor(Math.random()*LANE_COUNT);
      const z = laneDepthZ[ln];
      traffic.push({ lane: ln, z: 0.1, speed: (1.2 + Math.random()*0.8) * (turbo?1.25:1.0), color: '#2dd4bf' });
    } else if (r < 0.8){ // light
      lights.push({ z: 0.05, state: Math.random()<0.5 ? 'red' : 'green', t: 0 });
    } else { // pedestrian
      const ln = Math.floor(Math.random()*LANE_COUNT);
      pedestrians.push({ lane: ln, z: 0.07, t: 0 });
    }
  }

  function update(dt){
    if (!running) return;
    const sec = dt/1000; elapsed += sec;

    const base = night ? 90 : 100;
    speed = base + (turbo ? 80 : 0);
    distance += speed * sec / 3600;

    const growthPerSec = turbo ? 0.022 : 0.012;
    multiplier += growthPerSec * sec * 100;
    if (multiplier < 1.0) multiplier = 1.0;

    timeClean += sec;
    if (!turbo && timeClean >= 30) turbo = true;

    const worldSpeed = (turbo ? 1.9 : 1.4) * sec;
    traffic.forEach(c => c.z += worldSpeed * c.speed * 0.9);
    pedestrians.forEach(p => { p.z += worldSpeed*0.9; p.t += sec; });
    lights.forEach(l => { l.z += worldSpeed*0.9; l.t += sec; if (l.t>4){ l.state = (l.state==='red')?'green':'red'; l.t=0; } });

    for (const c of traffic){
      if (c.lane === lane && c.z > 0.9){ crash(); return; }
    }
    for (const l of lights){
      if (l.state==='red' && l.z > 0.9 && l.z < 1.05){ addFine(); l.state = 'used'; }
    }
    for (const p of pedestrians){
      if (p.lane===lane && p.z > 0.9 && p.z < 1.05){ addFine(); p.lane = -99; }
    }

    traffic = traffic.filter(c => c.z < 1.3);
    pedestrians = pedestrians.filter(p => p.z < 1.3 && p.lane !== -99);
    lights = lights.filter(l => l.z < 1.3 && l.state!=='used');

    spawn();
  }

  function addFine(){
    fines += 1; finesEl.textContent = String(fines); timeClean = 0; flash(160);
    if (fines >= 3) crash();
  }

  function cashout(){
    if (!running) return;
    running = false; btnWithdraw.disabled = true;
    const payout = (Number(betEl.value||'100') * multiplier).toFixed(2);
    ovTitle.textContent = 'YOU CASHED OUT!';
    ovMult.textContent = multiplier.toFixed(2)+'x';
    ovDist.textContent = distance.toFixed(2);
    ovWin.textContent = `${betCurrency} ${payout}`;
    overlay.classList.remove('hidden');
  }

  function crash(){
    running = false; btnWithdraw.disabled = true;
    ovTitle.textContent = 'GAME OVER';
    ovMult.textContent = multiplier.toFixed(2)+'x';
    ovDist.textContent = distance.toFixed(2);
    ovWin.textContent = `${betCurrency} 0.00`;
    overlay.classList.remove('hidden');
    blast(12);
  }

  let flashUntil = 0;
  function flash(ms){ flashUntil = performance.now()+ms; }
  let blasts = [];
  function blast(n=10){
    blasts = [];
    for (let i=0;i<n;i++){
      blasts.push({x: canvas.width/2, y: canvas.height*0.7, r: 10+i*4, a: 1.0});
    }
  }

  function renderRoad(){
    const ctx2 = ctx;
    ctx2.fillStyle = night ? '#07090d' : '#141820';
    ctx2.fillRect(0,0,canvas.width,canvas.height);

    const grd = ctx2.createLinearGradient(0,0,0,canvas.height);
    grd.addColorStop(0, night? '#0b0f18' : '#1f2840');
    grd.addColorStop(1, night? '#0a0c11' : '#101318');
    ctx2.fillStyle = grd;
    ctx2.fillRect(0,0,canvas.width,canvas.height);

    const wTop = canvas.width*0.2;
    const wBottom = canvas.width*0.86;
    const roadTopY = canvas.height*0.15;
    const roadBottomY = canvas.height*0.98;

    ctx2.fillStyle = night ? '#15171d' : '#1a1e27';
    ctx2.beginPath();
    ctx2.moveTo((canvas.width-wTop)/2, roadTopY);
    ctx2.lineTo((canvas.width+wTop)/2, roadTopY);
    ctx2.lineTo((canvas.width+wBottom)/2, roadBottomY);
    ctx2.lineTo((canvas.width-wBottom)/2, roadBottomY);
    ctx2.closePath(); ctx2.fill();

    for (let i=1;i<LANE_COUNT;i++){
      const t = i/LANE_COUNT;
      const xTop = (canvas.width-wTop)/2 + wTop*t;
      const xBottom = (canvas.width-wBottom)/2 + wBottom*t;
      ctx2.strokeStyle = night? 'rgba(240,240,255,0.22)':'rgba(240,240,255,0.35)';
      ctx2.setLineDash([14,18]);
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(xTop, roadTopY);
      ctx2.lineTo(xBottom, roadBottomY);
      ctx2.stroke();
      ctx2.setLineDash([]);
    }

    const stripeCount = 16;
    for (let i=0;i<stripeCount;i++){
      const p = (i/stripeCount + (elapsed* (turbo?1.5:1.0)) % 1);
      const y = roadTopY + (roadBottomY-roadTopY)*p;
      const widthAtY = wTop + (wBottom-wTop)*p;
      const stripeW = Math.max(6, widthAtY*0.01);
      const stripeH = 8;
      const xc = canvas.width/2;
      ctx2.fillStyle = night? '#c6cadd88' : '#e5e8ffaa';
      ctx2.fillRect(xc - stripeW/2, y, stripeW, stripeH);
    }
  }

  function renderTraffic(){
    const roadTopY = canvas.height*0.15;
    const roadBottomY = canvas.height*0.98;
    const wTop = canvas.width*0.2;
    const wBottom = canvas.width*0.86;
    function xOnRoad(t, p){
      const w = wTop + (wBottom-wTop)*p;
      return (canvas.width-w)/2 + w*t;
    }
    function yOnRoad(p){ return roadTopY + (roadBottomY-roadTopY)*p; }

    for (const l of lights){
      const p = Math.min(1, l.z);
      const x = xOnRoad(0.95, p);
      const y = yOnRoad(p);
      const r = 8*(1-p*0.5);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = (l.state==='red') ? '#ff3b30' : '#34c759';
      ctx.fill();
    }

    for (const pd of pedestrians){
      const p = Math.min(1, pd.z);
      const t = (pd.lane + 0.5)/LANE_COUNT;
      const x = xOnRoad(t, p);
      const y = yOnRoad(p);
      ctx.fillStyle = '#ffd166';
      const s = Math.max(6, 12*(1-p));
      ctx.fillRect(x-6, y-6, s, s);
    }

    for (const c of traffic){
      const p = Math.min(1, c.z);
      const t = (c.lane + 0.5)/LANE_COUNT;
      const x = xOnRoad(t, p);
      const y = yOnRoad(p);
      const scale = (1.2 - 0.7*p);
      const w = 60*scale, h = 100*scale;
      ctx.fillStyle = c.color;
      ctx.fillRect(x - w/2, y - h/2, w, h);
      if (night){
        ctx.fillStyle = 'rgba(255,255,200,0.08)';
        ctx.fillRect(x - w/2, y - h/2, w, h/2);
      }
    }

    const playerT = (lane + 0.5)/LANE_COUNT;
    const py = yOnRoad(0.95);
    const px = xOnRoad(playerT, 0.95);
    ctx.strokeStyle = '#00f5a0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, 20, 0, Math.PI*2); ctx.stroke();

    if (turbo){
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
  }

  let flashUntil = 0, blasts = [];
  function renderFX(){
    if (performance.now() < flashUntil){
      ctx.fillStyle = 'rgba(255,0,0,0.18)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    for (const b of blasts){
      ctx.strokeStyle = `rgba(255,200,0,${b.a})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.stroke();
      b.r += 2; b.a -= 0.03;
    }
    blasts = blasts.filter(b => b.a > 0);
  }

  let last = 0;
  function loop(ts){
    if (!last) last = ts;
    const dt = ts - last; last = ts;

    if (running){
      update(dt);
      multEl.textContent = multiplier.toFixed(2)+'x';
      timerEl.textContent = (parseFloat(timerEl.textContent)+dt/1000).toFixed(1);
      speedEl.textContent = Math.round(speed);
      distEl.textContent = distance.toFixed(2);
    }

    renderRoad();
    renderTraffic();
    renderFX();

    requestAnimationFrame(loop);
  }

  function startRound(){
    resetGame();
    running = true;
    btnWithdraw.disabled = false;
    startScreen.classList.add('hidden');
    hud.classList.remove('hidden');
  }
  function backToMenu(){
    running = false;
    startScreen.classList.remove('hidden');
    hud.classList.add('hidden');
    overlay.classList.add('hidden');
  }

  function cashout(){
    if (!running) return;
    running = false; btnWithdraw.disabled = true;
    const payout = (Number(betEl.value||'100') * multiplier).toFixed(2);
    ovTitle.textContent = 'YOU CASHED OUT!';
    ovMult.textContent = multiplier.toFixed(2)+'x';
    ovDist.textContent = distance.toFixed(2);
    ovWin.textContent = `${currencyEl.value} ${payout}`;
    overlay.classList.remove('hidden');
  }
  function crash(){
    running = false; btnWithdraw.disabled = true;
    ovTitle.textContent = 'GAME OVER';
    ovMult.textContent = multiplier.toFixed(2)+'x';
    ovDist.textContent = distance.toFixed(2);
    ovWin.textContent = `${currencyEl.value} 0.00`;
    overlay.classList.remove('hidden');
    blasts = []; for (let i=0;i<12;i++){ blasts.push({x: canvas.width/2, y: canvas.height*0.7, r: 10+i*4, a: 1.0}); }
  }

  function addFine(){ fines += 1; finesEl.textContent = String(fines); timeClean = 0; flashUntil = performance.now()+160; if (fines >= 3) crash(); }

  btnStart.onclick = () => { startRound(); };
  btnWithdraw.onclick = () => cashout();
  btnPlayAgain.onclick = () => { overlay.classList.add('hidden'); startRound(); };
  btnBack.onclick = () => backToMenu();

  window.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft' || e.key === 'a') { if (lane>0) lane--; }
    if (e.key === 'ArrowRight' || e.key === 'd') { if (lane<LANE_COUNT-1) lane++; }
    if (e.key === ' ' && running) cashout();
    if (e.key.toLowerCase() === 't'){ night = !night; modeEl.textContent = night?'NIGHT':'DAY'; }
  });

  resetGame();
  requestAnimationFrame(loop);
})();