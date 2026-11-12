"use strict";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num = v => v == null ? "–" : Number(v).toLocaleString("en-US");
const NAT = new Intl.Collator("en", { numeric: true });  // (instance names in number order: dmu9 < dmu41, tai_.._2 < tai_.._10)
const secs = (t, exact) => t == null ? "–" : (exact ? "" : "≤ ") + (t < 10 ? t.toFixed(1) : Math.round(t).toLocaleString("en-US")) + " s";
const gpuName = s => (s || "").split(" · ")[0].replace(/ \(\d+ GB\)/, "");
const VERDICT = { "improves the best known value": ["improves", "below best known"],
                  "equals the best known value": ["equals", "best known"],
                  "above the best known value": ["above", "above best known"] };
// (rows with a reference other than a best known value, r.ref: our scaling set against OptalCP's run)
const verdict = r => { const v = VERDICT[r.verdict]; if (!v) return ["", "–"];
  return r.ref ? [v[0], { improves: "below OptalCP", equals: "equal to OptalCP", above: "above OptalCP" }[v[0]]] : v; };
const PROBLEM = new URLSearchParams(location.search).get("p") === "fjsp" ? "fjsp" : "jsp";
const LEAD = {
  jsp: `For every instance, the best schedule our GPU solvers have found. Each one is checked independently against
  ScheduleOpt's instance file (job order, machine capacity, makespan recomputed from the machine sequences) and compared with
  ScheduleOpt's best known bounds. Click an instance for its Gantt chart. Every instance can be downloaded as text
  (first line: jobs and machines; then one line per job with its operations as machine and duration pairs in route
  order, machines numbered from 0), every schedule in ScheduleOpt's solution format.`,
  fjsp: `For every instance, the best schedule our GPU solver has found; every operation runs on one machine chosen among
  its options. Each schedule is checked independently against the instance file (the machine is one of the operation's
  options, job order, machine capacity, makespan recomputed from the machine sequences) and compared with ScheduleOpt's
  best known bounds. Our own scaling set (SFJS) has no literature values; its schedules are compared with a run of
  OptalCP on the same instance. Click an instance for its Gantt chart. Instances download in the .fjs format (first
  line: jobs, machines; then per job its number of operations and, per operation, the number of options followed by
  machine and duration pairs, machines numbered from 1); schedules as JSON with the machine and the start time of
  every operation, job by job.` };

// ---------------------------------------------------------------- index page
// (v: the build stamp, appended to every data URL: GitHub Pages lets browsers cache files for 10 minutes, and old data
// with a new script showed empty columns)
async function siteIndex(v) {
  const F = PROBLEM === "fjsp";
  document.getElementById(F ? "tab-fjsp" : "tab-jsp").classList.add("on");
  document.getElementById("h1").textContent = F ? "schweminOPT best flexible job shop schedules" : "schweminOPT best job shop schedules";
  document.getElementById("lead").textContent = LEAD[PROBLEM].replace(/\s+/g, " ");
  const data = await (await fetch(`data/${F ? "fjsp_index" : "index"}.json?v=${v}`)).json();
  const rows = data.rows;
  const lit = rows.filter(r => !r.ref && r.ub != null), own = rows.filter(r => !(!r.ref && r.ub != null));
  const cnt = k => lit.filter(r => VERDICT[r.verdict] && VERDICT[r.verdict][0] === k).length;
  document.getElementById("tiles").innerHTML = [["instances", rows.length], ["below best known", cnt("improves")],
    ["equal to best known", cnt("equals")], ["above best known", cnt("above")]]
    .concat(own.length ? [["scaling set schedules", own.length]] : [])
    .map(([k, val]) => `<div class="tile"><div class="k">${k}</div><div class="v">${val}</div></div>`).join("");
  // one card per family, stacked; the search and the result filter apply to all of them, each card sorts on its own
  const ORDER = ["Fisher, Thompson", "Lawrence", "Adams, Balas, Zawack", "Applegate, Cook", "Storer, Wu, Vaccari",
                 "Yamada, Nakano", "Taillard", "Demirkol", "Da Col & Teppan (tai)",
                 "Brandimarte", "Chambers, Barnes", "Dauzère-Pérès, Paulli", "Behnke, Geiger", "Fattahi, Mehrabad, Jolai",
                 "Kacem, Hammadi, Borne", "Hurink, Jurisch, Thole · sdata", "Hurink, Jurisch, Thole · edata",
                 "Hurink, Jurisch, Thole · rdata", "Hurink, Jurisch, Thole · vdata", "SFJS · edata", "SFJS · rdata", "SFJS · vdata"];
  const fams = [...new Set(rows.map(r => r.family))]
    .sort((a, b) => ((ORDER.indexOf(a) + 1) || 99) - ((ORDER.indexOf(b) + 1) || 99) || a.localeCompare(b));
  document.getElementById("foot").insertAdjacentHTML("beforeend", ` Generated ${esc(data.generated)}.`);
  // (two lines per cell, so everything fits without scrolling sideways; a header sorts by its cell's first line)
  const cols = [["instance", "instance", ""], ["makespan", "makespan", "n"], ["gap", "result", ""],
                ["time_to_best", "time to best", "n"], ["system", "run", ""], ["date", "date", ""]];
  const st = { q: "", ver: "" };
  const box = document.getElementById("fams");
  const cards = fams.map((f, i) => {
    const mine = rows.filter(r => r.family === f);
    const c = k => mine.filter(r => verdict(r)[0] === k).length;
    const parts = [["improves", "below"], ["equals", "equal"], ["above", "above"]].filter(([k]) => c(k))
      .map(([k, t]) => `<span class="${k}">${c(k)} ${t}</span>`).join(" · ");
    box.insertAdjacentHTML("beforeend", `<section class="card fam" id="fam${i}">
      <div class="fhead"><h2>${esc(f)}</h2><span class="fsum">${mine.length} instance${mine.length > 1 ? "s" : ""} · ${parts}</span></div>
      <div class="tbox"><table><thead><tr>${cols.map(([k, t, cl]) => `<th data-k="${k}" class="${cl}">${t}</th>`).join("")}<th></th></tr></thead>
      <tbody></tbody></table></div></section>`);
    const el = document.getElementById(`fam${i}`);
    return { el, mine, sort: null, dir: 1 };
  });
  const row = r => {
    const [cls, label] = verdict(r);
    const name = r.gantt ? `<a href="schedule.html?i=${encodeURIComponent(r.instance)}${F ? "&p=fjsp" : ""}">${esc(r.instance)}</a>` : esc(r.instance);
    const iurl = r.instance_url || `instances/${encodeURIComponent(r.instance)}.txt`;
    const surl = r.solution_url || `solutions/${encodeURIComponent(r.instance)}.json`;
    const refl = r.ref ? `<span title="${esc(r.ref)}">OptalCP</span>` : "best known";
    const gap = r.gap == null ? "–" : (r.gap > 0 ? "+" : "") + r.gap.toFixed(2) + " %";
    const tt = r.time_exact ? "when the run first reached this makespan"
                            : "first checkpoint of the run that shows it (the exact time was not recorded)";
    return `<tr><td>${name}<div class="sub">${r.jobs} × ${r.machines}${F ? ` · ${num(r.operations)} ops` : ""}</div></td>`
      + `<td class="n">${num(r.makespan)}<div class="sub">${refl} ${num(r.ub)} · LB ${num(r.lb)}</div></td>`
      + `<td><span class="chip ${cls}">${label}</span><div class="sub">gap ${gap}</div></td>`
      + `<td class="n" title="${tt}">${secs(r.time_to_best, r.time_exact)}<div class="sub">of ${secs(r.run_seconds, true)}</div></td>`
      + `<td title="${esc(r.system)}&#10;${esc(r.solver)}">${esc(gpuName(r.system))}<div class="sub">${esc(r.solver_short || r.solver)}</div></td>`
      + `<td>${esc(r.date)}</td>`
      + `<td class="dl"><a href="${esc(iurl)}" download title="${F ? "the instance in the .fjs format (machines from 1)" : "the instance: jobs and machines, then per job machine / duration pairs (machines from 0)"}">instance</a>`
      + `<div class="sub"><a href="${esc(surl)}" download title="${F ? "machine (from 1) and start time of every operation, job by job" : "schedule in ScheduleOpt's format"}">schedule</a></div></td></tr>`;
  };
  const fill = () => {
    const q = st.q.toLowerCase();
    let shown = 0;
    for (const c of cards) {
      let list = c.mine.filter(r => (!q || r.instance.toLowerCase().includes(q)) && (!st.ver || verdict(r)[0] === st.ver));
      if (c.sort) {
        const key = r => r[c.sort];
        list = list.slice().sort((a, b) => {
          if (c.sort === "instance") return NAT.compare(a.instance, b.instance) * c.dir;  // (dmu41 .. dmu80, ta01 .. ta80)
          const x = key(a), y = key(b); if (x == null) return 1; if (y == null) return -1;
          return (x < y ? -1 : x > y ? 1 : 0) * c.dir; });
      }
      c.el.hidden = list.length === 0;
      c.el.querySelector("tbody").innerHTML = list.map(row).join("");
      c.el.querySelectorAll("th[data-k]").forEach(th => th.textContent = th.textContent.replace(/ [▲▼]$/, "")
        + (c.sort === th.dataset.k ? (c.dir > 0 ? " ▲" : " ▼") : ""));
      shown += list.length;
    }
    document.getElementById("count").textContent = `${shown} of ${rows.length}`;
  };
  if (F) siteSfjs(v, rows); else siteSjs(v);
  document.getElementById("q").addEventListener("input", e => { st.q = e.target.value; fill(); });
  document.getElementById("ver").addEventListener("change", e => { st.ver = e.target.value; fill(); });
  for (const c of cards) c.el.querySelectorAll("th[data-k]").forEach(th => th.addEventListener("click", () => {
    c.dir = c.sort === th.dataset.k ? -c.dir : 1; c.sort = th.dataset.k; fill(); }));
  fill();
}

// ---------------------------------------------------------------- SJS: our own instance set (downloads only)
// (an introduction card with the whole-set downloads, then one card per group listing every instance)
async function siteSjs(v) {
  let d;
  try { d = await (await fetch(`data/sjs.json?v=${v}`)).json(); } catch (e) { return; }
  const mb = b => b >= 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB";
  const box = document.getElementById("sjs");
  box.innerHTML = `<section class="card"><div class="fhead"><h2>schweminOPT Job Shop Scaling set (SJS, 2026)</h2>`
    + `<span class="fsum">${d.instances} instances, 10 per size · no schedules yet</span></div>`
    + `<p class="lead">Our own instances for measuring solvers across sizes and shapes, from Taillard's generator: `
    + `every instance can be regenerated from its two seeds. Same text format as above (gzip-compressed from 50,000 `
    + `operations).</p><p class="links"><a href="sjs/SJS2026.zip" download>whole set (zip, ${mb(d.zip_bytes)})</a> · `
    + `<a href="sjs/sjs_seeds.csv" download>seeds</a> · <a href="sjs/checksums.sha256" download>checksums</a> · `
    + `<a href="sjs/README.md">README</a></p></section>`;
  for (const g of [...new Set(d.sizes.map(s => s.group))]) {
    const sizes = d.sizes.filter(s => s.group === g);
    const n = sizes.reduce((a, s) => a + s.files.length, 0);
    const rows = sizes.flatMap(s => s.files.map(f =>
      `<tr><td>${esc(f.name)}<div class="sub">${s.jobs} × ${s.machines}</div></td>`
      + `<td class="n">${num(s.operations)}<div class="sub">times 1..${s.dmax}</div></td>`
      + `<td class="n">${f.time_seed}<div class="sub">${f.machine_seed}</div></td>`
      + `<td class="dl"><a href="${esc(f.file)}" download>instance</a><div class="sub">${mb(f.bytes)}</div></td></tr>`)).join("");
    box.insertAdjacentHTML("beforeend", `<section class="card"><div class="fhead"><h2>SJS · ${esc(g)}</h2>`
      + `<span class="fsum">${n} instances · ${sizes.map(s => `${s.jobs} × ${s.machines}`).join(", ")}</span></div>`
      + `<div class="tbox"><table class="sjst"><thead><tr><th>instance</th><th class="n">operations</th>`
      + `<th class="n">time seed<div class="sub">machine seed</div></th><th>download</th></tr></thead>`
      + `<tbody>${rows}</tbody></table></div></section>`);
  }
}

// ---------------------------------------------------------------- SFJS: our flexible scaling set (downloads)
async function siteSfjs(v, rows) {
  let d;
  try { d = await (await fetch(`data/sfjs.json?v=${v}`)).json(); } catch (e) { return; }
  const mb = b => b >= 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB";
  const have = new Set(rows.map(r => r.instance));
  const box = document.getElementById("sjs");
  box.innerHTML = `<section class="card"><div class="fhead"><h2>schweminOPT Flexible Job Shop Scaling set (SFJS, 2026)</h2>`
    + `<span class="fsum">${d.instances} instances · ${d.files.filter(f => have.has(f.name)).length} with a schedule above</span></div>`
    + `<p class="lead">Our own instances for measuring solvers across sizes and shapes: instances of our job shop scaling `
    + `set (SJS, see the job shop tab) with machine options per operation in the manner of Hurink, Jurisch and Thole's `
    + `edata and rdata sets, from 2,500 to 490,000 operations. Version 2: the 84 instances that two trivial lower bounds `
    + `(the longest job, and all work divided by the machines) do not close; version 1 also had high-flexibility and `
    + `machine-rich instances, which those bounds solve. Our search takes up to about 300 machines with machine choice, `
    + `so the sizes with 500 and 700 machines have no schedule here. The .fjs format as above (gzip-compressed from `
    + `50,000 operations).</p><p class="links"><a href="sfjs/sfjs_v2.csv" download>instance list with bounds</a> · `
    + `<a href="sfjs/sfjs_seeds.csv" download>seeds</a> · <a href="sfjs/checksums.sha256" download>checksums</a> · `
    + `<a href="sfjs/README.md">README</a></p></section>`;
  const KIND = { edata: "1.15 machines per operation on average", rdata: "2 machines per operation on average",
                 vdata: "half the machines per operation on average" };
  for (const k of ["edata", "rdata", "vdata"]) {
    const files = d.files.filter(f => f.kind === k);
    if (!files.length) continue;
    const body = files.map(f =>
      `<tr><td>${esc(f.name)}<div class="sub">${f.jobs} × ${f.machines}${have.has(f.name) ? " · schedule above" : ""}</div></td>`
      + `<td class="n">${num(f.operations)}<div class="sub">${num(f.options)} options</div></td>`
      + `<td class="n">${num(f.lb)}</td>`
      + `<td class="dl"><a href="${esc(f.file)}" download>instance</a><div class="sub">${mb(f.bytes)}</div></td></tr>`).join("");
    box.insertAdjacentHTML("beforeend", `<section class="card"><div class="fhead"><h2>SFJS · ${k}</h2>`
      + `<span class="fsum">${files.length} instances · ${KIND[k]}</span></div>`
      + `<div class="tbox"><table class="sjst"><thead><tr><th>instance</th><th class="n">operations</th>`
      + `<th class="n">trivial lower bound</th><th>download</th></tr></thead>`
      + `<tbody>${body}</tbody></table></div></section>`);
  }
}

// ---------------------------------------------------------------- schedule page (Gantt chart)
async function siteSchedule(v) {
  const inst = new URLSearchParams(location.search).get("i") || "";
  let d;
  const F = PROBLEM === "fjsp";
  document.querySelector("header a").href = F ? "./?p=fjsp" : "./";
  try { d = await (await fetch(`data/${F ? "fjsp/" : ""}${encodeURIComponent(inst)}.json?v=${v}`)).json(); }
  catch (e) { document.getElementById("title").textContent = `no schedule for "${inst}"`; return; }
  document.title = `${d.instance} Schedule`;
  const [cls, label] = d.verdict ? verdict(d) : ["", ""];
  document.getElementById("title").innerHTML = `${esc(d.instance)} <span class="chip ${cls}" style="font-size:.8rem;vertical-align:middle">${label}</span>`;
  document.getElementById("sub").textContent = `${d.solver}. System: ${d.system}.${d.date ? " Run of " + d.date + "." : ""}`;
  const crit = d.ops.reduce((n, o) => n + o[5], 0);
  document.getElementById("info").innerHTML = [`makespan ${num(d.makespan)}`, `${d.ref ? d.ref : "best known"} ${num(d.ub)}`, `lower bound ${num(d.lb)}`,
    d.gap == null ? "" : `gap ${(d.gap > 0 ? "+" : "") + d.gap.toFixed(2)} %`,
    `time to best ${secs(d.time_to_best, d.time_exact)}`, `run ${secs(d.run_seconds, true)}`, `${d.jobs} jobs × ${d.machines} machines`,
    `${num(d.operations)} operations`, d.options ? `${num(d.options)} machine options` : "", `${num(crit)} critical`,
    `<a href="${esc(d.instance_url || `instances/${encodeURIComponent(d.instance)}.txt`)}" download>instance (${F ? ".fjs" : ".txt"})</a>`,
    `<a href="${esc(d.solution_url || `solutions/${encodeURIComponent(d.instance)}.json`)}" download>schedule (${F ? "machine and start per operation" : "ScheduleOpt format"})</a>`]
    .filter(Boolean).map(x => `<span>${x.startsWith("<a") ? x : esc(x)}</span>`).join("");
  const G = { job: null, bars: [] };
  const cv = document.getElementById("gc"), box = document.getElementById("gbox"), tip = document.getElementById("tip");
  const draw = () => {
    const css = getComputedStyle(document.documentElement), col = n => css.getPropertyValue(n).trim();
    const left = 46, right = 12, top = 24, rowH = Math.max(5, Math.min(26, Math.floor(620 / d.machines)));
    const W = Math.max(640, box.clientWidth - 2), H = top + rowH * d.machines + 8, dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = (W - left - right) / d.makespan, x = t => left + t * sx;
    ctx.fillStyle = col("--surface"); ctx.fillRect(0, 0, W, H);
    ctx.font = "11px " + col("--mono"); ctx.textBaseline = "middle";
    const raw = d.makespan / 10, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 5, 10].map(f => f * mag).find(v => v >= raw);
    ctx.strokeStyle = col("--line"); ctx.fillStyle = col("--muted"); ctx.lineWidth = 1;
    for (let t = 0; t <= d.makespan; t += step) {
      ctx.beginPath(); ctx.moveTo(Math.round(x(t)) + .5, top - 4); ctx.lineTo(Math.round(x(t)) + .5, H - 8); ctx.stroke();
      ctx.textAlign = "center"; ctx.fillText(t.toLocaleString("en-US"), x(t), 11);
    }
    ctx.textAlign = "right";
    for (let m = 0, every = Math.ceil(12 / rowH); m < d.machines; m += every) ctx.fillText("M" + (m + (F ? 1 : 0)), left - 6, top + m * rowH + rowH / 2);
    G.bars = [];
    const pad = rowH > 10 ? 2 : rowH > 6 ? 1 : 0;
    for (const o of d.ops) {
      const [j, k, m, s, du, c] = o;
      const bx = x(s), bw = Math.max(1, du * sx), by = top + m * rowH + pad, bh = rowH - 2 * pad;
      const sel = G.job === j, dim = G.job != null && !sel;
      ctx.globalAlpha = dim ? 0.22 : 1;
      ctx.fillStyle = col(sel ? "--g-job" : c ? "--g-crit" : "--g-op");
      ctx.fillRect(bx, by, Math.max(1, bw - (bw > 3 ? 1 : 0)), bh);
      ctx.globalAlpha = 1;
      G.bars.push([bx, by, bw, bh, o]);
    }
    ctx.strokeStyle = col("--bad"); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x(d.makespan), top - 4); ctx.lineTo(x(d.makespan), H - 8); ctx.stroke();
  };
  const at = e => {
    const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    for (let i = G.bars.length - 1; i >= 0; i--) { const [bx, by, bw, bh, o] = G.bars[i];
      if (px >= bx && px <= bx + Math.max(bw, 2) && py >= by && py <= by + bh) return o; }
    return null;
  };
  cv.addEventListener("mousemove", e => {
    const o = at(e); if (!o) { tip.hidden = true; return; }
    const [j, k, m, s, du, c] = o;
    tip.textContent = `job ${j}, operation ${k}\nmachine ${m + (F ? 1 : 0)}\n${s} – ${s + du} (duration ${du})${c ? "\ncritical" : ""}`;
    tip.hidden = false; tip.style.left = (e.clientX + 14) + "px"; tip.style.top = (e.clientY + 12) + "px";
  });
  cv.addEventListener("mouseleave", () => { tip.hidden = true; });
  cv.addEventListener("click", e => { const o = at(e); G.job = o && G.job !== o[0] ? o[0] : null; draw(); });
  window.addEventListener("resize", draw);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  draw();
}
