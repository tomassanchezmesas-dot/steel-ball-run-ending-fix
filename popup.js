const ENDINGS = {
  horse: {title: "A Horse With No Name", url: "https://www.youtube.com/watch?v=oMiX8tZqswI", emoji: "🐎"},
  california: {title: "California Dreamin'", url: "https://www.youtube.com/watch?v=j7J4IrIYQvY", emoji: "🌴"}
};

let selectedEndingKey = "horse";

const fields = [
  "enabled", "mode", "requireSeriesMatch", "triggerByCreditsButton",
  "triggerByRemainingTime", "secondsBeforeEnd", "delaySeconds",
  "autoResumeNetflix", "skipOriginalEnding", "autoCloseOverlay",
  "autoCloseYouTubeTab", "endingDurationSeconds", "debug"
];

const defaults = {
  enabled: true, selectedEnding: "horse", mode: "overlay", requireSeriesMatch: true,
  triggerByCreditsButton: true, triggerByRemainingTime: true,
  secondsBeforeEnd: 110, delaySeconds: 0, autoResumeNetflix: true,
  skipOriginalEnding: true, autoCloseOverlay: true, autoCloseYouTubeTab: true,
  endingDurationSeconds: 91, debug: false, keywords: [
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
    const url = res.tab.url || "";
    if (!url.startsWith("https://www.netflix.com/watch/")) {
      $("statusText").textContent = "Abre un episodio en Netflix";
      $("statusDetails").textContent = "La detección funciona en netflix.com/watch/…";
      $("meterFill").style.width = "0%";
      return;
    }
    const st = res.status;
    if (!st) {
      $("statusText").textContent = "Recarga Netflix";
      $("statusDetails").textContent = "La pestaña estaba abierta antes de actualizar la extensión.";
      return;
    }

    $("statusText").textContent = st.triggered ? "Ending ya activado" :
      st.seriesMatch?.match ? "Steel Ball Run detectado" :
      st.forcedForTab ? "Pestaña activada manualmente" : "Vigilando";

    const lines = [];
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
      $("secondsBeforeEnd").value = val;
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
      $("secondsBeforeEnd").value = val;
      $("statusText").textContent = `Calibrado a ${val.toFixed(1)} s 🐎`;
      setTimeout(() => window.close(), 450);
    } else {
      $("statusText").textContent = "No pude leer el tiempo de Netflix";
    }
  });
});

$("refresh").addEventListener("click", refreshStatus);

load();
setInterval(refreshStatus, 1400);
