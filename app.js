(() => {
  "use strict";
  const KEYS = { analyses: "ticoh_ict_analyses_v1", journal: "ticoh_ict_journal_v1" };
  const $ = (id) => document.getElementById(id);
  const state = { h4: null, m15: null, current: null };
  const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { toast("Browser storage is full. Export or remove older records."); return false; } };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  let toastTimer;
  function toast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === id));
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.target === id));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (id === "journal") renderJournal();
    if (id === "history") renderHistory();
  }
  document.querySelectorAll("[data-target]").forEach(b => b.addEventListener("click", () => showView(b.dataset.target)));
  document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => showView(b.dataset.goto)));

  function loadImage(inputId, key, nameId) {
    const input = $(inputId);
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { toast("Use a PNG, JPG or WEBP image."); input.value = ""; return; }
      if (file.size > 8 * 1024 * 1024) { toast("Image is larger than 8 MB. Please resize it first."); input.value = ""; return; }
      const reader = new FileReader();
      reader.onload = () => {
        state[key] = { name: file.name, type: file.type, data: reader.result, size: file.size };
        $(nameId).textContent = file.name + " · " + (file.size / 1024).toFixed(0) + " KB";
      };
      reader.onerror = () => toast("Could not read that image.");
      reader.readAsDataURL(file);
    });
  }
  loadImage("h4File", "h4", "h4Name");
  loadImage("m15File", "m15", "m15Name");

  function symbolValue() {
    const selected = $("symbol").value;
    return selected === "OTHER" ? $("otherSymbol").value.trim().toUpperCase() : selected;
  }
  function createAnalysis() {
    if (!state.h4 || !state.m15) { toast("Upload both H4 and M15 screenshots first."); return; }
    const symbol = symbolValue();
    if (!symbol) { toast("Enter the broker symbol."); return; }
    const analysis = {
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      symbol, createdAt: new Date().toISOString(), bias: $("bias").value,
      structure: $("structure").value, notes: $("notes").value.trim(),
      h4: state.h4, m15: state.m15, signal: "WAIT",
      entry: "", sl: "", tp1: "", tp2: "", tp3: "", trigger: "",
      confluence: [], source: "Screenshots"
    };
    state.current = analysis;
    renderPlan(analysis);
    showView("analysis");
    toast("Analysis workspace created. Verify observations before setting levels.");
  }
  $("analyseBtn").addEventListener("click", createAnalysis);

  function formatTime(iso) {
    try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
    catch { return iso || "Unknown"; }
  }
  function renderPlan(a) {
    $("analysisEmpty").hidden = true; $("analysisResult").hidden = false;
    $("planSymbol").textContent = a.symbol;
    $("planTimestamp").textContent = "Created " + formatTime(a.createdAt) + " · Screenshot mode · Not live";
    $("outBias").textContent = a.bias || "Neutral";
    $("outH4Structure").textContent = a.bias === "Neutral" ? "Not established" : "User-selected; verify on chart";
    $("outStructure").textContent = a.structure || "Unclear";
    $("planNotes").textContent = a.notes || "No chart notes supplied. Review H4 range, external liquidity, premium/discount and higher-timeframe POIs. On M15, wait for a relevant liquidity event and a confirmed structure shift before defining an entry. Exact price levels are unavailable until verified by the user.";
    setPreview("h4Preview", a.h4, "H4 screenshot unavailable");
    setPreview("m15Preview", a.m15, "M15 screenshot unavailable");
    $("planSignal").value = a.signal || "WAIT";
    ["entry","sl","tp1","tp2","tp3","trigger"].forEach(k => $(k).value = a[k] ?? "");
    document.querySelectorAll("#confluenceChecks input").forEach(c => c.checked = (a.confluence || []).includes(c.value));
    updateSignalPill(); updateRR(); updateEvidenceScore();
  }
  function setPreview(id, image, fallback) {
    const el = $(id); el.replaceChildren();
    if (image && image.data) {
      const img = document.createElement("img"); img.src = image.data; img.alt = "Uploaded chart screenshot"; el.appendChild(img);
    } else el.textContent = fallback;
  }
  function currentFormData() {
    if (!state.current) return null;
    const a = { ...state.current, signal: $("planSignal").value, trigger: $("trigger").value.trim() };
    ["entry","sl","tp1","tp2","tp3"].forEach(k => a[k] = $(k).value.trim());
    a.confluence = [...document.querySelectorAll("#confluenceChecks input:checked")].map(c => c.value);
    return a;
  }
  function num(id) { const v = $(id).value.trim(); return v === "" ? NaN : Number(v); }
  function rr(entry, stop, target, direction) {
    if (![entry, stop, target].every(Number.isFinite)) return null;
    const risk = Math.abs(entry - stop);
    if (risk <= 0) return null;
    const reward = direction === "SELL" ? entry - target : target - entry;
    if (reward <= 0) return null;
    return reward / risk;
  }
  function updateRR() {
    const entry = num("entry"), stop = num("sl"), direction = $("planSignal").value;
    const vals = ["tp1","tp2","tp3"].map(k => rr(entry, stop, num(k), direction));
    $("rrOutput").innerHTML = vals.map((v,i) => `<div><span>TP${i+1} R:R</span><strong>${v === null ? "—" : "1 : " + v.toFixed(2)}</strong></div>`).join("");
  }
  function updateSignalPill() {
    const signal = $("planSignal").value, pill = $("signalPill");
    pill.textContent = signal; pill.className = "pill " + (signal === "BUY" ? "green-pill" : signal === "SELL" ? "red-pill" : "amber");
  }
  function updateEvidenceScore() {
    const n = document.querySelectorAll("#confluenceChecks input:checked").length;
    $("evidenceScore").textContent = n + " / 6";
  }
  ["planSignal","entry","sl","tp1","tp2","tp3"].forEach(id => $(id).addEventListener("input", () => { updateRR(); updateSignalPill(); }));
  document.querySelectorAll("#confluenceChecks input").forEach(c => c.addEventListener("change", updateEvidenceScore));

  function savePlan() {
    const a = currentFormData(); if (!a) { toast("Create an analysis first."); return; }
    if (a.signal === "BUY" || a.signal === "SELL") {
      const e = Number(a.entry), s = Number(a.sl);
      const valid = Number.isFinite(e) && Number.isFinite(s) && (a.signal === "BUY" ? s < e : s > e);
      if (!valid) { toast("Check entry and SL: BUY SL must be below entry; SELL SL above entry."); return; }
    }
    a.savedAt = new Date().toISOString();
    const all = read(KEYS.analyses); const idx = all.findIndex(x => x.id === a.id);
    if (idx >= 0) all[idx] = a; else all.unshift(a);
    if (write(KEYS.analyses, all.slice(0,100))) { state.current = a; refreshStats(); renderHistory(); toast("Plan saved in this browser."); }
  }
  $("savePlanBtn").addEventListener("click", savePlan);
  $("newAnalysisBtn").addEventListener("click", () => { state.current = null; showView("dashboard"); });
  $("copyPlanBtn").addEventListener("click", async () => {
    const a = currentFormData(); if (!a) return;
    const text = planText(a);
    try { await navigator.clipboard.writeText(text); toast("Trade plan copied."); }
    catch { fallbackCopy(text); }
  });
  function fallbackCopy(text) {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Trade plan copied."); } catch { toast("Copy unavailable. Use Export report."); }
    ta.remove();
  }
  function planText(a) {
    return [
      "TICOH ICT SMART TRADER — TRADE PLAN", "Symbol: " + a.symbol, "Data source: MT5 screenshots (manual review)",
      "Analysis timestamp: " + formatTime(a.createdAt), "Current price: UNAVAILABLE — not connected to live MT5",
      "H4 bias: " + a.bias, "M15 structure: " + a.structure, "Signal: " + a.signal,
      "Entry: " + (a.entry || "Not set"), "Stop Loss: " + (a.sl || "Not set"),
      "TP1: " + (a.tp1 || "Not set"), "TP2: " + (a.tp2 || "Not set"), "TP3: " + (a.tp3 || "Not set"),
      "Entry trigger / invalidation: " + (a.trigger || "Not defined"),
      "Verified confluence: " + (a.confluence.join(", ") || "None checked"),
      "Notes: " + (a.notes || "No notes"), "Reminder: Screenshot analysis can become outdated. Verify all levels and broker costs before any trade."
    ].join("\n");
  }
  function renderHistory() {
    const all = read(KEYS.analyses), el = $("historyList");
    if (!all.length) { el.innerHTML = '<div class="empty-list">No saved analyses yet.</div>'; return; }
    el.innerHTML = all.map(a => `<div class="list-item"><div><strong>${esc(a.symbol)} · ${esc(a.signal || "WAIT")}</strong><p>${esc(formatTime(a.savedAt || a.createdAt))} · H4 ${esc(a.bias)} · M15 ${esc(a.structure)}</p></div><button class="button secondary" data-open-analysis="${esc(a.id)}">Open plan</button></div>`).join("");
    el.querySelectorAll("[data-open-analysis]").forEach(b => b.addEventListener("click", () => {
      const a = all.find(x => x.id === b.dataset.openAnalysis); if (!a) return;
      state.current = a; renderPlan(a); showView("analysis");
    }));
  }
  $("clearHistoryBtn").addEventListener("click", () => {
    if (!confirm("Delete all saved analysis history from this browser?")) return;
    write(KEYS.analyses, []); refreshStats(); renderHistory(); toast("Analysis history cleared.");
  });

  function addJournal() {
    const symbol = $("jSymbol").value.trim().toUpperCase();
    if (!symbol) { toast("Enter a symbol."); return; }
    const record = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), symbol, direction: $("jDirection").value,
      entry: $("jEntry").value, exit: $("jExit").value, result: $("jResult").value, r: $("jR").value,
      notes: $("jNotes").value.trim(), createdAt: new Date().toISOString() };
    const all = read(KEYS.journal); all.unshift(record);
    if (write(KEYS.journal, all.slice(0,300))) {
      ["jEntry","jExit","jR","jNotes"].forEach(id => $(id).value = "");
      renderJournal(); refreshStats(); toast("Journal entry saved.");
    }
  }
  $("addJournalBtn").addEventListener("click", addJournal);
  function renderJournal() {
    const all = read(KEYS.journal), el = $("journalList");
    if (!all.length) { el.innerHTML = '<div class="empty-list">No journal entries yet. Add a trade above.</div>'; return; }
    el.innerHTML = all.map(j => `<div class="list-item"><div><strong>${esc(j.symbol)} · ${esc(j.direction)} · ${esc(j.result)}</strong><p>${esc(formatTime(j.createdAt))} · Entry ${esc(j.entry || "—")} → Exit ${esc(j.exit || "—")} · R ${esc(j.r || "—")}</p>${j.notes ? `<p>${esc(j.notes)}</p>` : ""}</div><button class="button secondary" data-delete-journal="${esc(j.id)}">Delete</button></div>`).join("");
    el.querySelectorAll("[data-delete-journal]").forEach(b => b.addEventListener("click", () => {
      if (!confirm("Delete this journal entry?")) return;
      write(KEYS.journal, read(KEYS.journal).filter(j => j.id !== b.dataset.deleteJournal)); renderJournal(); refreshStats();
    }));
  }

  function calculateRisk() {
    const balance = num("balance"), pct = num("riskPct"), entry = num("riskEntry"), stop = num("riskSL"), target = num("riskTP"), costs = num("costs");
    const validBase = balance > 0 && pct > 0 && pct <= 100 && Number.isFinite(entry) && Number.isFinite(stop) && entry !== stop && costs >= 0;
    if (!validBase) { toast("Enter a positive balance, risk percentage, entry, SL and non-negative costs."); return; }
    const riskMoney = balance * pct / 100, distance = Math.abs(entry - stop), r = rr(entry, stop, target, "BUY") ?? rr(entry, stop, target, "SELL");
    const loss = riskMoney + costs;
    $("riskResults").innerHTML = [
      ["Maximum planned risk", riskMoney.toFixed(2)],
      ["Stop distance", distance.toString()],
      ["Target R:R", r === null ? "—" : "1 : " + r.toFixed(2)],
      ["Risk plus entered costs", loss.toFixed(2)]
    ].map(([label,value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
    if (costs >= riskMoney) toast("Warning: entered costs equal or exceed your planned risk.");
  }
  $("calcRiskBtn").addEventListener("click", calculateRisk);

  function refreshStats() {
    $("statAnalyses").textContent = read(KEYS.analyses).length;
    $("statJournal").textContent = read(KEYS.journal).length;
  }
  function exportReport() {
    const payload = { app: "TICOH ICT SMART TRADER", exportedAt: new Date().toISOString(),
      disclaimer: "Screenshot analysis only. No live feed. Not financial advice.",
      analyses: read(KEYS.analyses).map(a => ({ ...a, h4: a.h4 ? {name:a.h4.name,type:a.h4.type} : null, m15: a.m15 ? {name:a.m15.name,type:a.m15.type} : null })),
      journal: read(KEYS.journal) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "ticoh-ict-smart-trader-report.json"; a.click(); URL.revokeObjectURL(url);
    toast("Report exported. Screenshot image data is excluded from export.");
  }
  $("exportBtn").addEventListener("click", exportReport);

  refreshStats(); renderHistory(); renderJournal();
})();
