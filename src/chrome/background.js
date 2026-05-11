const ALARM_NAME = "keepalive-moodle-session";
const PERIOD_MINUTES = 10;
const MOODLE_URL = "https://moodle.telt.unsw.edu.au/*"

// async function refreshMoodleTabs() {
//   try {
//     const tabs = await chrome.tabs.query({
//       url: ["https://moodle.telt.unsw.edu.au/*"]
//     });

//     for (const tab of tabs) {
//       if (tab.id == null || !tab.url) continue;

//       // Do not reload /mod/lti/ pages
//       if (tab.url.startsWith("https://moodle.telt.unsw.edu.au/mod/lti/")) {
//         continue;
//       }

//       // Do not reload /mod/quiz/ pages
//       if (tab.url.startsWith("https://moodle.telt.unsw.edu.au/mod/quiz/")) {
//         continue;
//       }

//       // Skip the tab you're actively using
//       if (tab.active) continue;

//       // Skip tabs that are currently loading
//       if (tab.status === "loading") continue;

//       // Reload only background Moodle tabs
//       await chrome.tabs.reload(tab.id);
//     }
//   } catch (error) {
//     console.error("Failed to refresh Moodle tabs:", error);
//   }
// }

function ensureAlarm() {
  const existing = await chrome.alarms.get(ALARM_NAME);

  if (!existing) {
    await chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: PERIOD_MINUTES
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: PERIOD_MINUTES
  });
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    refreshMoodleTabs();
  }
});

async function findMoodleTab() {
  const tabs = await chrome.tabs.query({ url: MOODLE_URL });

  return tabs.find((candidate) => {
    if (!candidate.id) return false;

    const url = candidate.url ?? "";
    return !url.includes("/mod/quiz/") && !url.includes("/mod/lti/");
  });
}