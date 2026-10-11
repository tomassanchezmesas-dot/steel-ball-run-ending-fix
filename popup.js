const ENDINGS = {
  horse: {title: "A Horse With No Name", url: "https://www.youtube.com/watch?v=oMiX8tZqswI", emoji: "🐎"},
  california: {title: "California Dreamin'", url: "https://www.youtube.com/watch?v=j7J4IrIYQvY", emoji: "🌴"}
};

let selectedEndingKey = "horse";
let activeTab = null;
let currentPattern = null;
let siteAllowed = false;

function siteFromURL(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.protocol + "//" + u.hostname + "/*";
  } catch { return null; }
}
function netflixTab() {
  try { return new URL(activeTab?.url).hostname === "www.netflix.com"; }
  catch { return false; }
}
async function updateSiteAccess() {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  activeTab = tab || null;
  currentPattern = siteFromURL(tab?.url);
  const enable=$("enableSite"), disable=$("disableSite");
  if (!currentPattern) {
    siteAllowed=false;enable.hidden=true;disable.hidden=true;
    $("siteDomain").textContent="This page cannot run extensions";
    $("sitePermissionStatus").textContent="Open an ordinary HTTP(S) video website.";
    return;
  }
  $("siteDomain").textContent = new URL(tab.url).hostname;
  if (netflixTab()) {
    siteAllowed=true;enable.hidden=true;disable.hidden=true;
    $("sitePermissionStatus").textContent="Netflix is enabled by default.";
    return;
  }
  siteAllowed=await chrome.permissions.contains({origins:[currentPattern]});
  enable.hidden=siteAllowed;disable.hidden=!siteAllowed;
  $("sitePermissionStatus").textContent=siteAllowed ?
    "Enabled for this site. Arm the tab if the series title is not visible." :
    "Permission is off. Press Enable to allow access to this hostname only.";
}
async function enableCurrentSite() {
  if (!currentPattern || !activeTab) return;
  const p=currentPattern,tab=activeTab;
  // Request permissions synchronously as part of this click gesture.
  try {
    const granted=await chrome.permissions.request({origins:[p]});
    if (!granted) { $("sitePermissionStatus").textContent="Permission declined.";return; }
    const registered=await chrome.runtime.sendMessage({type:"SBR_REGISTER_SITE",pattern:p});
    if (!registered?.ok) { $("sitePermissionStatus").textContent=registered?.error||"Could not enable site"; return; }
    const injected=await chrome.runtime.sendMessage({type:"SBR_INJECT_TAB",pattern:p,tabId:tab.id});
    await updateSiteAccess();
    $("sitePermissionStatus").textContent=injected?.ok ?
      "Enabled! Floating playback controls are ready." :
      "Permission saved. Reload this video tab to initialize the detector.";
    refreshStatus();
  } catch (error) { $("sitePermissionStatus").textContent=String(error); }
}
async function disableCurrentSite() {
  if (!currentPattern || netflixTab()) return;
  const p=currentPattern;
  try {await chrome.tabs.sendMessage(activeTab.id,{type:"SBR_DISABLE_SITE"});}catch{}
  await chrome.runtime.sendMessage({type:"SBR_UNREGISTER_SITE",pattern:p});
  await chrome.permissions.remove({origins:[p]});
  await updateSiteAccess();
  $("sitePermissionStatus").textContent="Site disabled. Reload to completely unload the script.";
  refreshStatus();
}


const fields = [
  "enabled", "mode", "requireSeriesMatch", "triggerByCreditsButton",
  "triggerByRemainingTime", "secondsBeforeEnd", "delaySeconds",
  "autoResumeNetflix", "skipOriginalEnding", "autoCloseOverlay",
  "autoCloseYouTubeTab", "endingDurationSeconds", "showFloatingButton", "debug"
];

const defaults = {
  enabled: true, selectedEnding: "horse", mode: "overlay", requireSeriesMatch: true,
  triggerByCreditsButton: true, triggerByRemainingTime: true,
  secondsBeforeEnd: 110, delaySeconds: 0, autoResumeNetflix: true,
  skipOriginalEnding: true, autoCloseOverlay: true, autoCloseYouTubeTab: true,
  endingDurationSeconds: 91, showFloatingButton: true, debug: false, keywords: [
    "steel ball run",
    "jojo's bizarre adventure: steel ball run",
    "jojo’s bizarre adventure: steel ball run",
    "スティール・ボール・ラン",
    "ジョジョの奇妙な冒険 スティール・ボール・ラン",
    "스틸 볼 런",
    "스틸볼런"
  ]
};

const $ = id => document.getElementById(id);

function fmt(sec) {
  if (sec == null || !Number.isFinite(sec)) return "—";
  sec = Math.max(0, sec);
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function setEndingUI(key) {
  selectedEndingKey = ENDINGS[key] ? key : "horse";
  document.querySelectorAll(".ending-option").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.ending === selectedEndingKey);
  });
  const ending = ENDINGS[selectedEndingKey];
  $("endingSelected").textContent = `Seleccionado: ${ending.emoji} ${ending.title}`;
  $("openSelected").href = ending.url;
}

async function selectEnding(key) {
  setEndingUI(key);
  await chrome.storage.sync.set({selectedEnding: selectedEndingKey});
  $("saveState").textContent = `Ending: ${ENDINGS[selectedEndingKey].title}`;
  setTimeout(() => $("saveState").textContent = "Guardado automáticamente", 1000);
  setTimeout(refreshStatus, 120);
}

async function load() {
  const s = await chrome.storage.sync.get(defaults);
  setEndingUI(s.selectedEnding);
  for (const id of fields) {
    const el = $(id);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = !!s[id];
    else el.value = s[id];
  }
  $("keywords").value = (s.keywords || []).join("\n");
  await updateSiteAccess();
  refreshStatus();
}

let saveTimer;
function scheduleSave() {
  clearTimeout(saveTimer);
  $("saveState").textContent = "Guardando…";
  saveTimer = setTimeout(save, 120);
}

async function save() {
  const out = {};
  for (const id of fields) {
    const el = $(id);
    if (!el) continue;
    if (el.type === "checkbox") out[id] = el.checked;
    else if (el.type === "number") out[id] = Number(el.value);
    else out[id] = el.value;
  }
  out.selectedEnding = selectedEndingKey;
  out.keywords = $("keywords").value.split("\n").map(x => x.trim()).filter(Boolean);
  await chrome.storage.sync.set(out);
  $("saveState").textContent = "Guardado automáticamente";
  setTimeout(refreshStatus, 120);
}

async function refreshStatus() {
  chrome.runtime.sendMessage({type: "SBR_POPUP_STATUS"}, (res) => {
    if (chrome.runtime.lastError || !res?.tab) {
      $("statusText").textContent = "Sin pestaña activa";
      $("statusDetails").textContent = "";
      return;
    }
    if (!siteAllowed) {
      $("statusText").textContent = "Enable this website";
      $("statusDetails").textContent = "Grant permission above to use this website.";
      $("meterFill").style.width = "0%";
      return;
    }
    const st = res.status;
    if (!st) {
      $("statusText").textContent = "Recarga Netflix";
      $("statusDetails").textContent = "Reload this website after updating the extension.";
      return;
    }

    $("statusText").textContent = st.triggered ? "Ending ya activado" :
      st.seriesMatch?.match ? "Steel Ball Run detectado" :
      st.forcedForTab ? "Pestaña activada manualmente" : "Vigilando";

    const lines = [];
    if(st.site) lines.push("Site: "+st.site);
    if (st.ending?.title) lines.push(`Ending: ${st.ending.emoji || "🎵"} ${st.ending.title}`);
    lines.push(`Serie: ${st.seriesMatch?.match ? "sí" : "no"}${st.seriesMatch?.source ? ` (${st.seriesMatch.source})` : ""}`);
    lines.push(`Botón créditos: ${st.creditsButton?.present ? "sí" : "no (no pasa nada; usamos tiempo)"}`);
    if (st.video) {
      lines.push(`Video: ${fmt(st.video.currentTime)} / ${fmt(st.video.duration)}`);
      lines.push(`Restante: ${st.video.remaining?.toFixed(1) ?? "—"} s · disparo: ${Number(st.threshold).toFixed(1)} s`);
      const progress = Math.max(0, Math.min(1, st.video.progress || 0));
      $("meterFill").style.width = `${progress * 100}%`;
    } else {
      lines.push("Video: Netflix aún no expone el reloj del reproductor");
      $("meterFill").style.width = "0%";
    }
    if (st.lastReason) lines.push(`Estado: ${st.lastReason}`);
    $("statusDetails").textContent = lines.join("\n");
  });
}

for (const id of fields) {
  const el = $(id);
  if (!el) continue;
  el.addEventListener("change", scheduleSave);
  el.addEventListener("input", scheduleSave);
}
$("keywords").addEventListener("input", scheduleSave);
document.querySelectorAll(".ending-option").forEach(btn => {
  btn.addEventListener("click", () => selectEnding(btn.dataset.ending));
});

$("force").addEventListener("click", () => {
  chrome.runtime.sendMessage({type: "SBR_POPUP_FORCE"}, (res) => {
    $("statusText").textContent = res?.ok ? "Prueba enviada 🐎" : "No disponible";
    setTimeout(() => window.close(), 350);
  });
});

$("arm").addEventListener("click", () => {
  chrome.runtime.sendMessage({type: "SBR_POPUP_ARM"}, (res) => {
    $("statusText").textContent = res?.ok ? "Pestaña activada 🐎" : "No disponible";
    setTimeout(refreshStatus, 220);
  });
});

$("calibrateOnly").addEventListener("click", () => {
  chrome.runtime.sendMessage({type: "SBR_POPUP_CALIBRATE"}, async (res) => {
    const val = res?.result?.calibrated;
    if (res?.ok && Number.isFinite(val)) {
      $("triggerByRemainingTime").checked = true;
      $("statusText").textContent = `Calibrado a ${val.toFixed(1)} s`;
    } else {
      $("statusText").textContent = "No pude leer el tiempo de Netflix";
    }
    setTimeout(refreshStatus, 350);
  });
});

$("calibratePlay").addEventListener("click", () => {
  chrome.runtime.sendMessage({type: "SBR_POPUP_CALIBRATE_PLAY"}, (res) => {
    const val = res?.result?.calibrated;
    if (res?.ok && Number.isFinite(val)) {
      $("statusText").textContent = `Calibrado a ${val.toFixed(1)} s 🐎`;
      setTimeout(() => window.close(), 450);
    } else {
      $("statusText").textContent = "No pude leer el tiempo de Netflix";
    }
  });
});

$("refresh").addEventListener("click", refreshStatus);
$("enableSite").addEventListener("click", enableCurrentSite);
$("disableSite").addEventListener("click", disableCurrentSite);

load();
setInterval(refreshStatus, 1400);
