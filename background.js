const ENDINGS = {
  horse: {
    id: "oMiX8tZqswI",
    title: "A Horse With No Name",
    url: "https://www.youtube.com/watch?v=oMiX8tZqswI"
  },
  california: {
    id: "j7J4IrIYQvY",
    title: "California Dreamin'",
    url: "https://www.youtube.com/watch?v=j7J4IrIYQvY"
  }
};

function getEnding(key) {
  return ENDINGS[key] || ENDINGS.horse;
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

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(null);
  const merged = {...DEFAULTS, ...current};
  if (!current.detectorV11Migrated && (current.secondsBeforeEnd == null || Number(current.secondsBeforeEnd) === 92)) {
    merged.secondsBeforeEnd = 110;
  }
  merged.detectorV11Migrated = true;
  merged.embedRefererV12Migrated = true;
  if (!ENDINGS[merged.selectedEnding]) merged.selectedEnding = "horse";
  merged.endingChooserV13Migrated = true;
  if (current.skipOriginalEnding == null) merged.skipOriginalEnding = true;
  await chrome.storage.sync.set(merged);

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "sbr-force-ending",
      title: "🐎 Reproducir ending alternativo ahora",
      contexts: ["page"],
      documentUrlPatterns: ["https://www.netflix.com/watch/*"]
    });
    chrome.contextMenus.create({
      id: "sbr-calibrate-ending",
      title: "🎯 Marcar ESTE momento como inicio del ending",
      contexts: ["page"],
      documentUrlPatterns: ["https://www.netflix.com/watch/*"]
    });
    chrome.contextMenus.create({
      id: "sbr-arm-tab",
      title: "🐎 Activar detección por tiempo en esta pestaña",
      contexts: ["page"],
      documentUrlPatterns: ["https://www.netflix.com/watch/*"]
    });
  });
});

async function sendToTab(tabId, msg) {
  try { return await chrome.tabs.sendMessage(tabId, msg); }
  catch { return null; }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === "sbr-force-ending") {
    await sendToTab(tab.id, {type: "SBR_FORCE_ENDING"});
  } else if (info.menuItemId === "sbr-calibrate-ending") {
    await sendToTab(tab.id, {type: "SBR_CALIBRATE_NOW", playAfter: false});
  } else if (info.menuItemId === "sbr-arm-tab") {
    await sendToTab(tab.id, {type: "SBR_ARM_TAB"});
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "force-ending") return;
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (tab?.id) await sendToTab(tab.id, {type: "SBR_FORCE_ENDING"});
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.type) return;

  if (msg.type === "SBR_OPEN_YOUTUBE_TAB") {
    (async () => {
      const netflixTabId = sender.tab?.id;
      const settings = await chrome.storage.sync.get({
        selectedEnding: "horse",
        autoCloseYouTubeTab: true,
        endingDurationSeconds: 91
      });
      const ending = getEnding(msg.endingKey || settings.selectedEnding);
      const yt = await chrome.tabs.create({url: ending.url, active: true, openerTabId: netflixTabId});
      if (settings.autoCloseYouTubeTab && yt?.id && netflixTabId) {
        const when = Date.now() + Math.max(15, Number(settings.endingDurationSeconds) || 91) * 1000;
        const alarmName = `sbr-return:${yt.id}:${netflixTabId}`;
        await chrome.storage.session.set({[alarmName]: {youtubeTabId: yt.id, netflixTabId}});
        chrome.alarms.create(alarmName, {when});
      }
      sendResponse({ok: true, youtubeTabId: yt?.id});
    })();
    return true;
  }

  if (msg.type === "SBR_POPUP_FORCE" || msg.type === "SBR_POPUP_ARM" || msg.type === "SBR_POPUP_CALIBRATE" || msg.type === "SBR_POPUP_CALIBRATE_PLAY") {
    (async () => {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      let message;
      if (msg.type === "SBR_POPUP_FORCE") message = {type: "SBR_FORCE_ENDING"};
      if (msg.type === "SBR_POPUP_ARM") message = {type: "SBR_ARM_TAB"};
      if (msg.type === "SBR_POPUP_CALIBRATE") message = {type: "SBR_CALIBRATE_NOW", playAfter: false};
      if (msg.type === "SBR_POPUP_CALIBRATE_PLAY") message = {type: "SBR_CALIBRATE_NOW", playAfter: true};
      const result = tab?.id ? await sendToTab(tab.id, message) : null;
      sendResponse({ok: !!result, result});
    })();
    return true;
  }

  if (msg.type === "SBR_POPUP_STATUS") {
    (async () => {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      const result = tab?.id ? await sendToTab(tab.id, {type: "SBR_STATUS"}) : null;
      sendResponse({tab, status: result});
    })();
    return true;
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith("sbr-return:")) return;
  const saved = await chrome.storage.session.get(alarm.name);
  const data = saved[alarm.name];
  await chrome.storage.session.remove(alarm.name);
  if (!data) return;

  try { await chrome.tabs.remove(data.youtubeTabId); } catch {}
  try {
    await chrome.tabs.update(data.netflixTabId, {active: true});
    const t = await chrome.tabs.get(data.netflixTabId);
    if (t.windowId) await chrome.windows.update(t.windowId, {focused: true});
    await sendToTab(data.netflixTabId, {type: "SBR_RESUME_AFTER_EXTERNAL"});
  } catch {}
});
