(() => {
  "use strict";

  const ENDINGS = {
    horse: {
      id: "oMiX8tZqswI",
      title: "A Horse With No Name",
      artist: "Lil Blv",
      url: "https://www.youtube.com/watch?v=oMiX8tZqswI",
      emoji: "🐎"
    },
    california: {
      id: "j7J4IrIYQvY",
      title: "California Dreamin'",
      artist: "Lil Blv",
      url: "https://www.youtube.com/watch?v=j7J4IrIYQvY",
      emoji: "🌴"
    }
  };

  function currentEnding() {
    return ENDINGS[settings.selectedEnding] || ENDINGS.horse;
  }

  const DEFAULTS = {
    enabled: true,
    selectedEnding: "horse",
    mode: "overlay",
    requireSeriesMatch: true,
    triggerByCreditsButton: true,
    triggerByRemainingTime: true,
    secondsBeforeEnd: 110,
    delaySeconds: 0,
    autoResumeNetflix: true,
    skipOriginalEnding: true,
    autoCloseOverlay: true,
    autoCloseYouTubeTab: true,
    endingDurationSeconds: 91,
    debug: false,
    keywords: [
      "steel ball run",
      "jojo's bizarre adventure: steel ball run",
      "jojo’s bizarre adventure: steel ball run",
      "スティール・ボール・ラン",
      "ジョジョの奇妙な冒険 スティール・ボール・ラン",
      "스틸 볼 런",
      "스틸볼런"
    ]
  };

  const CREDIT_PHRASES = [
    "skip credits","skip credit","skip ending",
    "omitir créditos","omitir creditos","saltar créditos","saltar creditos",
    "pular créditos","pular creditos",
    "passer le générique","passer le generique",
    "abspann überspringen","abspann uberspringen",
    "salta i titoli di coda","saltar los créditos",
    "クレジットをスキップ","エンドクレジットをスキップ",
    "크레딧 건너뛰기","엔딩 건너뛰기"
  ];

  let settings = {...DEFAULTS};
  let forcedForTab = false;
  let seriesLatched = false;
  let seriesLatchSource = "";
  let triggered = false;
  let triggerInProgress = false;
  let lastPath = location.pathname;
  let lastSeriesMatch = null;
  let lastReason = "Esperando…";
  let overlay = null;
  let overlayTimer = null;
  let countdownTimer = null;
  let videoListenerBoundTo = null;
  let triggerSnapshot = null;

  const log = (...args) => {
    if (settings.debug) console.log("[SBR Ending Fix]", ...args);
  };

  const norm = (s) => (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  async function loadSettings() {
    settings = {...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS))};
    log("settings", settings);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [k, v] of Object.entries(changes)) settings[k] = v.newValue;
    if (settings.debug) toast("Configuración actualizada", 1400);
  });

  function getVideo() {
    const vids = [...document.querySelectorAll("video")];
    if (!vids.length) return null;
    vids.sort((a, b) => {
      const aScore = (a.clientWidth * a.clientHeight) + (a.readyState > 0 ? 1e9 : 0);
      const bScore = (b.clientWidth * b.clientHeight) + (b.readyState > 0 ? 1e9 : 0);
      return bScore - aScore;
    });
    return vids[0];
  }

  function effectiveDuration(video) {
    if (!video) return null;
    if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
    try {
      if (video.seekable && video.seekable.length) {
        const end = video.seekable.end(video.seekable.length - 1);
        if (Number.isFinite(end) && end > 0) return end;
      }
    } catch {}
    return null;
  }

  function videoTiming(video = getVideo()) {
    if (!video || !Number.isFinite(video.currentTime)) return null;
    const duration = effectiveDuration(video);
    if (!Number.isFinite(duration) || duration <= 0) return null;
    const remaining = duration - video.currentTime;
    return {
      currentTime: video.currentTime,
      duration,
      remaining,
      progress: duration > 0 ? video.currentTime / duration : null,
      paused: video.paused,
      readyState: video.readyState
    };
  }

  function candidateText() {
    const parts = [document.title];
    for (const sel of [
      "meta[property='og:title']", "meta[name='twitter:title']",
      "h1", "h2", "[data-uia*='title']", "[data-uia*='video-title']",
      "[data-uia*='player-title']", "[class*='title']", "[aria-label]"
    ]) {
      for (const el of document.querySelectorAll(sel)) {
        let t = "";
        if (el.tagName === "META") t = el.getAttribute("content") || "";
        else t = `${el.textContent || ""} ${el.getAttribute("aria-label") || ""}`;
        t = t.trim();
        if (t && t.length < 260) parts.push(t);
      }
    }
    return parts.join(" | ");
  }

  function detectSeries() {
    if (forcedForTab) return {match: true, source: "pestaña activada manualmente"};
    if (seriesLatched) return {match: true, source: `recordado: ${seriesLatchSource}`};

    const keywords = Array.isArray(settings.keywords) ? settings.keywords : DEFAULTS.keywords;
    const haystack = norm(candidateText());
    const hit = keywords.find(k => haystack.includes(norm(k)));
    if (hit) {
      seriesLatched = true;
      seriesLatchSource = hit;
      return {match: true, source: `texto: ${hit}`};
    }

    try {
      const bodyText = norm((document.body?.innerText || "").slice(0, 120000));
      const hit2 = keywords.find(k => bodyText.includes(norm(k)));
      if (hit2) {
        seriesLatched = true;
        seriesLatchSource = hit2;
        return {match: true, source: `página: ${hit2}`};
      }
    } catch {}

    return {match: false, source: "sin coincidencia"};
  }

  function creditsButtonPresent() {
    const candidates = document.querySelectorAll("button,[role='button'],a,[data-uia]");
    for (const el of candidates) {
      const txt = norm(`${el.textContent || ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("data-uia") || ""}`);
      if (!txt) continue;
      if (CREDIT_PHRASES.some(p => txt.includes(norm(p))) || txt.includes("skip-credits") || txt.includes("skipcredits")) {
        return {present: true, text: (el.textContent || el.getAttribute("aria-label") || el.getAttribute("data-uia") || "skip-credits").trim()};
      }
    }
    return {present: false, text: ""};
  }

  function remainingTimeMatch(video) {
    const t = videoTiming(video);
    if (!t || t.duration < 300 || t.remaining <= 0) return null;
    const threshold = Math.max(15, Number(settings.secondsBeforeEnd) || 110);
    return {match: t.remaining <= threshold, threshold, ...t};
  }

  function shouldAllowTrigger() {
    if (!settings.enabled) {
      lastReason = "Extensión desactivada";
      return false;
    }
    const sm = detectSeries();
    lastSeriesMatch = sm;
    if (settings.requireSeriesMatch && !sm.match) {
      lastReason = "Temporizador listo, pero no pude confirmar Steel Ball Run. Pulsa ‘Activar en esta pestaña’.";
      return false;
    }
    return true;
  }

  async function evaluate(reasonHint = "scan") {
    if (triggered || triggerInProgress || overlay) return;
    if (!shouldAllowTrigger()) return;

    if (settings.triggerByCreditsButton) {
      const c = creditsButtonPresent();
      if (c.present) {
        lastReason = `Créditos detectados: ${c.text || "botón"}`;
        return triggerEnding("credits-button");
      }
    }

    if (settings.triggerByRemainingTime) {
      const r = remainingTimeMatch(getVideo());
      if (r?.match) {
        lastReason = `Temporizador: quedan ${r.remaining.toFixed(1)} s (umbral ${r.threshold}s)`;
        return triggerEnding("remaining-time");
      }
      if (r) lastReason = `Vigilando: quedan ${r.remaining.toFixed(1)} s (activa a ${r.threshold}s)`;
      else lastReason = `Vigilando (${reasonHint}); esperando datos del reproductor`;
    } else {
      lastReason = `Vigilando (${reasonHint})`;
    }
  }

  function pauseNetflix() {
    const v = getVideo();
    if (v && !v.paused) {
      try { v.pause(); } catch {}
    }
  }

  function skipOfficialEndingAndResume() {
    const v = getVideo();
    if (!v) return;
    const duration = effectiveDuration(v);
    if (settings.skipOriginalEnding && Number.isFinite(duration) && duration > 1) {
      try {
        const target = Math.max(v.currentTime, duration - 0.35);
        v.currentTime = target;
      } catch {}
    }
    if (settings.autoResumeNetflix) {
      try {
        const p = v.play();
        if (p?.catch) p.catch(() => {});
      } catch {}
    }
  }

  function resumeNetflixWithoutSkipping() {
    const v = getVideo();
    if (v && settings.autoResumeNetflix) {
      try {
        const p = v.play();
        if (p?.catch) p.catch(() => {});
      } catch {}
    }
  }

  function toast(message, ms = 2600) {
    let t = document.getElementById("sbr-ending-fix-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "sbr-ending-fix-toast";
      document.documentElement.appendChild(t);
    }
    t.textContent = `🐎 ${message}`;
    t.classList.add("show");
    clearTimeout(t._hide);
    t._hide = setTimeout(() => t.classList.remove("show"), ms);
  }

  function makeOverlay() {
    if (overlay) return;
    pauseNetflix();

    overlay = document.createElement("div");
    overlay.id = "sbr-ending-fix-overlay";
    const ending = currentEnding();
    const ytEmbed = `https://www.youtube.com/embed/${ending.id}` +
      "?autoplay=1&rel=0&playsinline=1" +
      "&origin=" + encodeURIComponent("https://www.netflix.com") +
      "&widget_referrer=" + encodeURIComponent("https://www.netflix.com/");
    overlay.innerHTML = `
      <div class="sbr-shell" role="dialog" aria-modal="true" aria-label="Steel Ball Run Ending Fix">
        <div class="sbr-topbar">
          <div class="sbr-brand">🐎 STEEL BALL RUN ENDING FIX</div>
          <div class="sbr-actions">
            <button id="sbr-open-youtube" title="Abrir en YouTube">YouTube ↗</button>
            <button id="sbr-close" title="Cancelar y volver al ending oficial">✕</button>
          </div>
        </div>
        <div class="sbr-stage">
          <iframe id="sbr-player-frame"
            src="${ytEmbed}"
            title="${ending.title} — ${ending.artist}"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen></iframe>
          <div class="sbr-fallback">
            <div class="sbr-horse">${ending.emoji}</div>
            <div><strong>ENDING CORRECTED.</strong></div>
            <div class="sbr-small">El reproductor se carga directamente desde Netflix para enviar un Referer HTTP válido. Si no inicia, usa “YouTube ↗”.</div>
          </div>
        </div>
        <div class="sbr-bottom">
          <div>${ending.emoji} ${ending.title} — ${ending.artist}</div>
          <div id="sbr-countdown"></div>
        </div>
      </div>`;
    document.documentElement.appendChild(overlay);

    overlay.querySelector("#sbr-close")?.addEventListener("click", () => closeOverlay(false));
    overlay.querySelector("#sbr-open-youtube")?.addEventListener("click", () => window.open(ending.url, "_blank", "noopener,noreferrer"));

    const endAfter = Math.max(15, Number(settings.endingDurationSeconds) || 91);
    const started = Date.now();
    const cd = overlay.querySelector("#sbr-countdown");
    const tick = () => {
      const left = Math.max(0, Math.ceil(endAfter - (Date.now() - started) / 1000));
      if (cd) cd.textContent = settings.autoCloseOverlay ? `Ending oficial se saltará en ${left}s` : "";
    };
    tick();
    countdownTimer = setInterval(tick, 1000);

    if (settings.autoCloseOverlay) {
      overlayTimer = setTimeout(() => closeOverlay(true), endAfter * 1000);
    }
  }

  function closeOverlay(completed = false) {
    if (!overlay) return;
    clearTimeout(overlayTimer);
    clearInterval(countdownTimer);
    overlayTimer = countdownTimer = null;
    overlay.remove();
    overlay = null;
    if (completed) {
      skipOfficialEndingAndResume();
      toast(settings.skipOriginalEnding ? "Ending alternativo terminado — saltando el oficial" : "Volviendo a Netflix");
    } else {
      resumeNetflixWithoutSkipping();
      toast("Reemplazo cancelado — volviendo a Netflix");
    }
  }

  async function triggerEnding(source = "manual") {
    if (triggered || triggerInProgress) return;
    triggerInProgress = true;

    const v = getVideo();
    triggerSnapshot = videoTiming(v);
    const delay = Math.max(0, Number(settings.delaySeconds) || 0);
    if (delay > 0) {
      for (let n = delay; n > 0; n--) {
        toast(`ENDING DETECTADO — reemplazando en ${n}…`, 900);
        await new Promise(r => setTimeout(r, 1000));
        if (!settings.enabled && source !== "manual") {
          triggerInProgress = false;
          return;
        }
      }
    }

    triggered = true;
    triggerInProgress = false;
    pauseNetflix();
    toast("ENDING DETECTADO — corrigiendo…", 1200);

    const ending = currentEnding();
    if (settings.mode === "redirect") {
      location.href = ending.url;
      return;
    }
    if (settings.mode === "newtab") {
      chrome.runtime.sendMessage({type: "SBR_OPEN_YOUTUBE_TAB", endingKey: settings.selectedEnding});
      return;
    }
    makeOverlay();
  }

  function bindVideoEvents() {
    const v = getVideo();
    if (!v || v === videoListenerBoundTo) return;
    if (videoListenerBoundTo) {
      for (const ev of ["timeupdate", "durationchange", "loadedmetadata", "playing", "seeked"]) {
        try { videoListenerBoundTo.removeEventListener(ev, onVideoEvent); } catch {}
      }
    }
    videoListenerBoundTo = v;
    for (const ev of ["timeupdate", "durationchange", "loadedmetadata", "playing", "seeked"]) {
      v.addEventListener(ev, onVideoEvent, {passive: true});
    }
    log("video listener bound", videoTiming(v));
  }

  let lastTimeCheck = 0;
  function onVideoEvent() {
    const now = performance.now();
    const timing = videoTiming(getVideo());
    const nearEnd = timing?.remaining != null && timing.remaining < 360;
    const minGap = nearEnd ? 220 : 850;
    if (now - lastTimeCheck < minGap) return;
    lastTimeCheck = now;
    evaluate("video-event");
  }

  function resetForNavigation() {
    triggered = false;
    triggerInProgress = false;
    forcedForTab = false;
    seriesLatched = false;
    seriesLatchSource = "";
    lastSeriesMatch = null;
    lastReason = "Nueva reproducción detectada";
    triggerSnapshot = null;
    if (overlay) closeOverlay(false);
  }

  const observer = new MutationObserver(() => {
    bindVideoEvents();
    if (!triggered) evaluate("DOM");
  });

  async function calibrateNow(playAfter = false) {
    const timing = videoTiming(getVideo());
    if (!timing || timing.remaining <= 0) {
      toast("No pude leer el tiempo del video", 2200);
      return {ok: false, error: "timing-unavailable"};
    }
    const calibrated = Math.max(15, Math.min(300, Math.round(timing.remaining * 10) / 10));
    await chrome.storage.sync.set({secondsBeforeEnd: calibrated, triggerByRemainingTime: true});
    settings.secondsBeforeEnd = calibrated;
    settings.triggerByRemainingTime = true;
    forcedForTab = true;
    triggered = false;
    toast(`Calibrado: ${calibrated.toFixed(1)} s antes del final`, 2500);
    if (playAfter) setTimeout(() => triggerEnding("calibration"), 250);
    return {ok: true, calibrated, timing};
  }

  async function init() {
    await loadSettings();
    observer.observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label", "data-uia", "class"]});
    bindVideoEvents();
    setInterval(() => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        resetForNavigation();
      }
      bindVideoEvents();
      if (!triggered) evaluate("interval");
    }, 1000);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay) closeOverlay(false);
    }, true);

    evaluate("init");
    log("initialized");
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg?.type) return;

    if (msg.type === "SBR_FORCE_ENDING") {
      triggerEnding("manual");
      sendResponse({ok: true});
      return;
    }
    if (msg.type === "SBR_ARM_TAB") {
      forcedForTab = true;
      triggered = false;
      toast("Detección por tiempo activada para esta pestaña");
      evaluate("arm");
      sendResponse({ok: true, armed: true});
      return;
    }
    if (msg.type === "SBR_CALIBRATE_NOW") {
      calibrateNow(!!msg.playAfter).then(sendResponse);
      return true;
    }
    if (msg.type === "SBR_RESUME_AFTER_EXTERNAL") {
      skipOfficialEndingAndResume();
      triggered = true;
      toast(settings.skipOriginalEnding ? "Ending terminado — saltando el oficial" : "Ending terminado — Netflix reanudado");
      sendResponse({ok: true});
      return;
    }
    if (msg.type === "SBR_STATUS") {
      const v = getVideo();
      const sm = detectSeries();
      const cr = creditsButtonPresent();
      const timing = videoTiming(v);
      sendResponse({
        ok: true,
        enabled: settings.enabled,
        mode: settings.mode,
        selectedEnding: settings.selectedEnding,
        ending: currentEnding(),
        forcedForTab,
        seriesLatched,
        triggered,
        overlay: !!overlay,
        seriesMatch: sm,
        creditsButton: cr,
        video: timing,
        threshold: Math.max(15, Number(settings.secondsBeforeEnd) || 110),
        lastReason,
        triggerSnapshot
      });
      return;
    }
  });

  init();
})();
