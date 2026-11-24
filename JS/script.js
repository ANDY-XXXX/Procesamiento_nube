(function(){
  "use strict";
  const sysReduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let stored = null; try { stored = localStorage.getItem("anim"); } catch(e){}
  let calm = stored ? stored === "off" : sysReduce;
  document.documentElement.classList.toggle("calm", calm);
  const stage = document.getElementById("stage");
  const slides = Array.from(stage.querySelectorAll(".slide"));
  const N = slides.length;
  const maxStep = slides.map(s => {
    let m = 0; s.querySelectorAll("[data-step]").forEach(e => { m = Math.max(m, +e.dataset.step); }); return m;
  });
  let cur = 0, step = 0;

  /* ---- escala del escenario ---- */
  function fit(){ stage.style.setProperty("--s", Math.min(innerWidth / 1600, innerHeight / 900)); }
  addEventListener("resize", fit); fit();

  /* ---- animaciones con JS (solo corren en la diapositiva activa) ---- */
  const anims = new Map();
  function animFor(slide){
    if (anims.has(slide)) return anims.get(slide);
    let a = null;
    if (slide.dataset.anim === "cluster") a = Cluster(slide.querySelector("canvas"));
    if (slide.dataset.anim === "autoscale") a = Autoscale(slide);
    anims.set(slide, a); return a;
  }

  /* ---- navegación ---- */
  function setSteps(i, n){
    slides[i].querySelectorAll("[data-step]").forEach(e => e.classList.toggle("on", +e.dataset.step <= n));
  }
  const wipe = document.getElementById("wipe");
  let wiping = false, booted = false;
  function go(i, s){
    i = Math.max(0, Math.min(N - 1, i));
    if (wiping) return;
    const sec = slides[i].dataset.section;
    if (booted && !calm && i !== cur && sec !== slides[cur].dataset.section){
      /* cambio de sección: cortina de franjas; el cambio ocurre cuando la pantalla está cubierta */
      wiping = true;
      const parts = sec.split(" · ");
      const lab = wipe.querySelector("b");
      lab.innerHTML = "<span></span>";
      if (parts.length > 1){ const sm = document.createElement("small"); sm.textContent = "Sección " + parts[0]; lab.firstChild.appendChild(sm); }
      lab.firstChild.appendChild(document.createTextNode(parts[parts.length - 1]));
      wipe.className = ""; void wipe.offsetWidth;
      wipe.className = "go" + (i < cur ? " back" : "");
      setTimeout(() => {
        stage.classList.add("cut"); apply(i, s);
        requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove("cut")));
      }, 700);
      setTimeout(() => { wipe.className = ""; wiping = false; }, 1750);
      return;
    }
    apply(i, s);
  }
  function apply(i, s){
    const prev = cur;
    booted = true;
    stage.style.setProperty("--gx", (-i * 96) + "px");
    stage.style.setProperty("--gy", (-i * 28) + "px");
    stage.style.setProperty("--rx", [30, 80, 55, 10, 70, 40][i % 6] + "%");
    stage.style.setProperty("--ry", [0, 30, 70, 20, 90, 50][i % 6] + "%");
    slides.forEach((el, k) => {
      el.classList.toggle("active", k === i);
      el.classList.toggle("past", k < i);
      el.setAttribute("aria-hidden", k === i ? "false" : "true");
    });
    setSteps(i, s || 0);
    cur = i; step = s || 0;
    if (prev !== i){ const p = anims.get(slides[prev]); if (p) p.stop(); }
    const a = animFor(slides[i]); if (a) a.start();
    update();
  }
  function next(){
    if (wiping) return;
    startClock();
    if (step < maxStep[cur]){ step++; setSteps(cur, step); update(); }
    else if (cur < N - 1) go(cur + 1, 0);
  }
  function prev(){
    if (wiping) return;
    if (step > 0){ step--; setSteps(cur, step); update(); }
    else if (cur > 0) go(cur - 1, maxStep[cur - 1]);
  }

  /* ---- HUD ---- */
  const hud = document.getElementById("hud");
  const pad = n => String(n).padStart(2, "0");
  const indexList = document.getElementById("index-list");
  let lastSec = null;
  slides.forEach((s, k) => {
    const sec = s.dataset.section;
    if (sec !== lastSec){ const g = document.createElement("li"); g.className = "grp"; g.textContent = sec; indexList.appendChild(g); lastSec = sec; }
    const li = document.createElement("li"); const b = document.createElement("button");
    b.innerHTML = '<span class="n">' + pad(k + 1) + '</span><span></span>';
    b.lastChild.textContent = s.dataset.title;
    b.addEventListener("click", () => { go(k, 0); toggleIndex(false); });
    li.appendChild(b); indexList.appendChild(li);
  });
  const indexBtns = Array.from(indexList.querySelectorAll("button"));
  function update(){
    const s = slides[cur];
    document.getElementById("hud-sec").textContent = s.dataset.section;
    document.getElementById("hud-num").textContent = pad(cur + 1) + " / " + pad(N);
    const frac = (cur + (maxStep[cur] ? step / (maxStep[cur] + 1) : 0)) / (N - 1);
    document.getElementById("hud-bar").style.width = (Math.min(1, frac) * 100) + "%";
    document.getElementById("notes-text").textContent = s.dataset.notes || "";
    indexBtns.forEach((b, k) => b.classList.toggle("cur", k === cur));
    try { history.replaceState(null, "", "#slide-" + (cur + 1)); } catch(e){}
  }

  /* reloj */
  let t0 = 0, clockTimer = 0;
  const clockEl = document.getElementById("hud-clock");
  function startClock(){
    if (t0) return; t0 = Date.now();
    clockTimer = setInterval(() => { const sec = Math.floor((Date.now() - t0) / 1000); clockEl.textContent = pad(Math.floor(sec / 60)) + ":" + pad(sec % 60); }, 500);
  }
  clockEl.addEventListener("click", () => { clearInterval(clockTimer); t0 = 0; clockEl.textContent = "00:00"; });

  /* paneles */
  const indexEl = document.getElementById("index"), notesEl = document.getElementById("notes"), blackEl = document.getElementById("black");
  function toggleIndex(force){ const o = force === undefined ? !indexEl.classList.contains("open") : force; indexEl.classList.toggle("open", o); document.getElementById("b-index").setAttribute("aria-pressed", o); }
  function toggleNotes(){ const o = !notesEl.classList.contains("open"); notesEl.classList.toggle("open", o); document.getElementById("b-notes").setAttribute("aria-pressed", o); }
  function toggleFs(){
    try {
      if (!document.fullscreenElement){ const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(() => {}); }
      else { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); }
    } catch(e){}
  }
  document.getElementById("b-prev").addEventListener("click", prev);
  document.getElementById("b-next").addEventListener("click", next);
  document.getElementById("b-index").addEventListener("click", () => toggleIndex());
  document.getElementById("index-close").addEventListener("click", () => toggleIndex(false));
  document.getElementById("b-notes").addEventListener("click", toggleNotes);
  document.getElementById("b-fs").addEventListener("click", toggleFs);
  blackEl.addEventListener("click", () => blackEl.classList.remove("on"));
  const toastEl = document.getElementById("toast"); let toastT = 0;
  function toast(html, ms){ toastEl.innerHTML = html; toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), ms || 2500); }
  const animBtn = document.getElementById("b-anim");
  function setCalm(v, announce){
    calm = v; document.documentElement.classList.toggle("calm", calm);
    animBtn.setAttribute("aria-pressed", String(!calm));
    try { localStorage.setItem("anim", calm ? "off" : "on"); } catch(e){}
    const a = anims.get(slides[cur]); if (a){ a.stop(); a.start(); }
    if (announce) toast(calm ? "Animaciones desactivadas" : "Animaciones activadas");
  }
  animBtn.setAttribute("aria-pressed", String(!calm));
  animBtn.addEventListener("click", () => setCalm(!calm, true));
  if (calm && !stored) setTimeout(() => toast("Tu computadora tiene las animaciones reducidas. Presiona <kbd>A</kbd> o el botón de destellos de abajo para activarlas.", 7000), 600);

  addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (blackEl.classList.contains("on") && k !== "b" && k !== "B"){ blackEl.classList.remove("on"); e.preventDefault(); return; }
    if (["ArrowRight","PageDown"," ","Enter","ArrowDown"].includes(k)){ if (k === "Enter" && document.activeElement && document.activeElement.tagName === "BUTTON") return; e.preventDefault(); next(); }
    else if (["ArrowLeft","PageUp","Backspace","ArrowUp"].includes(k)){ e.preventDefault(); prev(); }
    else if (k === "Home"){ e.preventDefault(); go(0, 0); }
    else if (k === "End"){ e.preventDefault(); go(N - 1, 0); }
    else if (k === "f" || k === "F"){ toggleFs(); }
    else if (k === "n" || k === "N"){ toggleNotes(); }
    else if (k === "i" || k === "I"){ toggleIndex(); }
    else if (k === "a" || k === "A"){ setCalm(!calm, true); }
    else if (k === "b" || k === "B" || k === "."){ blackEl.classList.toggle("on"); }
    else if (k === "Escape"){ toggleIndex(false); }
  });

  /* clic en el escenario: avanza (Shift + clic regresa) */
  document.getElementById("viewport").addEventListener("click", e => {
    if (e.target.closest("button, a")) return;
    if (indexEl.classList.contains("open")){ toggleIndex(false); return; }
    e.shiftKey ? prev() : next();
  });

  /* deslizar en pantallas táctiles */
  let tx = null, ty = null;
  addEventListener("touchstart", e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  addEventListener("touchend", e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
    tx = null;
  }, { passive: true });

  /* ocultar controles cuando no se mueve el mouse */
  let idleT = 0;
  function wake(){ hud.classList.remove("idle"); document.body.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(() => { if (!hud.matches(":hover")){ hud.classList.add("idle"); document.body.classList.add("idle"); } }, 2600); }
  addEventListener("mousemove", wake); wake();

  /* ---- red de nodos (portada y cierre) ---- */
  function Cluster(cv){
    const W = 1600, H = 900, R = Math.min(2, (window.devicePixelRatio || 1) + .25);
    cv.width = W * R; cv.height = H * R;
    const c = cv.getContext("2d"); c.setTransform(R, 0, 0, R, 0, 0);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = 17, rows = 10, nodes = [], edges = [], adj = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++){
      nodes.push({ x: 40 + x * (W - 80) / (cols - 1) + (rnd() - .5) * 44, y: 40 + y * (H - 80) / (rows - 1) + (rnd() - .5) * 44, g: 0, amber: false });
      adj.push([]);
    }
    const id = (x, y) => y * cols + x;
    function link(a, b){ const e = { a, b }; edges.push(e); adj[a].push(e); adj[b].push(e); }
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++){
      if (x < cols - 1 && rnd() < .78) link(id(x, y), id(x + 1, y));
      if (y < rows - 1 && rnd() < .68) link(id(x, y), id(x, y + 1));
      if (x < cols - 1 && y < rows - 1 && rnd() < .2) link(id(x, y), id(x + 1, y + 1));
    }
    const pulses = [];
    function hop(from, prevNode, v, amber, life){
      const list = adj[from]; if (!list.length) return;
      const e = list[Math.floor(Math.random() * list.length)];
      const to = e.a === from ? e.b : e.a; if (to === prevNode) return;
      pulses.push({ f: from, t: to, p: 0, v, amber, life });
    }
    let raf = 0, running = false;
    function frame(){
      c.clearRect(0, 0, W, H);
      c.lineWidth = 1; c.strokeStyle = "rgba(91,155,255,.13)"; c.beginPath();
      for (const e of edges){ const A = nodes[e.a], B = nodes[e.b]; c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); }
      c.stroke();
      if (pulses.length < 80 && Math.random() < .55) hop(Math.floor(Math.random() * nodes.length), -1, .012 + Math.random() * .02, Math.random() < .2, 3 + Math.floor(Math.random() * 5));
      for (let i = pulses.length - 1; i >= 0; i--){
        const q = pulses[i]; q.p += q.v;
        const A = nodes[q.f], B = nodes[q.t];
        if (q.p >= 1){ B.g = 1; B.amber = q.amber; pulses.splice(i, 1); if (q.life > 0) hop(q.t, q.f, q.v, q.amber, q.life - 1); continue; }
        const x = A.x + (B.x - A.x) * q.p, y = A.y + (B.y - A.y) * q.p;
        const b = Math.max(0, q.p - .3), bx = A.x + (B.x - A.x) * b, by = A.y + (B.y - A.y) * b;
        const col = q.amber ? "255,181,71" : "125,175,255";
        const g = c.createLinearGradient(bx, by, x, y); g.addColorStop(0, "rgba(" + col + ",0)"); g.addColorStop(1, "rgba(" + col + ",.9)");
        c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by); c.lineTo(x, y); c.stroke();
        c.fillStyle = "rgb(" + col + ")"; c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill();
      }
      for (const n of nodes){
        const r = 2.2 + n.g * 3, col = n.amber ? "255,181,71" : "140,185,255";
        c.fillStyle = n.g > .04 ? "rgba(" + col + "," + (.35 + n.g * .65) + ")" : "rgba(91,155,255,.33)";
        c.beginPath(); c.arc(n.x, n.y, r, 0, 7); c.fill();
        if (n.g > .04){ c.fillStyle = "rgba(" + col + "," + (n.g * .16) + ")"; c.beginPath(); c.arc(n.x, n.y, r * 5, 0, 7); c.fill(); }
        n.g *= .95;
      }
      if (running) raf = requestAnimationFrame(frame);
    }
    return {
      start(){ if (running) return; if (calm){ for (let i = 0; i < 90; i++) frame(); return; } running = true; raf = requestAnimationFrame(frame); },
      stop(){ running = false; cancelAnimationFrame(raf); }
    };
  }

  /* ---- simulación de autoescalamiento ---- */
  function Autoscale(root){
    const svg = root.querySelector("svg.chart");
    const pT = svg.querySelector(".tr"), pA = svg.querySelector(".tr-area"), pC = svg.querySelector(".cap");
    const pods = Array.from(root.querySelectorAll(".rp"));
    const oT = root.querySelector('[data-o="t"]'), oR = root.querySelector('[data-o="r"]'), oC = root.querySelector('[data-o="c"]');
    const ev = root.querySelector(".event");
    const W = 760, H = 320, MAX = 6000, LEN = 100, CAP = 800, TARGET = .7;
    let t = 0, rep = 2, cool = 0, timer = 0;
    const tr = [], cp = [];
    function traffic(t){
      const cyc = t % 320;
      let v = 1500 + 650 * Math.sin(t / 28) + 220 * Math.sin(t / 8.5);
      let spike = 0; if (cyc > 200 && cyc < 262) spike = 3500 * Math.sin(Math.PI * (cyc - 200) / 62);
      return { v: Math.max(250, v + spike + (Math.random() - .5) * 160), spike: spike > 500 };
    }
    const X = i => i * (W / (LEN - 1)), Y = v => H - (Math.min(v, MAX) / MAX) * H;
    let last = { v: 0, spike: false };
    function tick(draw){
      const r = traffic(t++); last = r;
      const desired = Math.min(10, Math.max(1, Math.ceil(r.v / (CAP * TARGET))));
      if (desired > rep){ rep = Math.min(desired, rep + 2); cool = 0; }
      else if (desired < rep){ if (++cool > 9){ rep--; cool = 0; } }
      else cool = 0;
      tr.push(r.v); cp.push(rep * CAP);
      if (tr.length > LEN){ tr.shift(); cp.shift(); }
      if (draw) render();
    }
    function render(){
      let d = "";
      for (let i = 0; i < tr.length; i++) d += (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(tr[i]).toFixed(1);
      pT.setAttribute("d", d);
      pA.setAttribute("d", d + "L" + X(tr.length - 1).toFixed(1) + " " + H + "L0 " + H + "Z");
      let s = "M0 " + Y(cp[0]).toFixed(1);
      for (let i = 1; i < cp.length; i++) s += "H" + X(i).toFixed(1) + "V" + Y(cp[i]).toFixed(1);
      pC.setAttribute("d", s);
      pods.forEach((p, k) => p.classList.toggle("on", k < rep));
      const cpu = Math.min(100, Math.round(last.v / (rep * CAP) * 100));
      oT.textContent = Math.round(last.v).toLocaleString("es-MX");
      oR.textContent = rep;
      oC.textContent = cpu + "%";
      oC.parentElement.classList.toggle("hot", cpu > 85);
      ev.classList.toggle("show", last.spike);
    }
    for (let i = 0; i < LEN; i++) tick(false);
    render();
    return {
      start(){ if (timer) return; timer = setInterval(() => tick(true), calm ? 400 : 140); },
      stop(){ clearInterval(timer); timer = 0; }
    };
  }

  /* ---- inicio ---- */
  const m = /slide-(\d+)/.exec(location.hash || "");
  go(m ? (+m[1] - 1) : 0, 0);
})();