const ALARM_NAME = "refresh-moodle";
const PERIOD_MINUTES = 10;

async function refreshMoodleTabs() {
  try {
    const tabs = await browser.tabs.query({
      url: ["https://moodle.telt.unsw.edu.au/*"]
    });

    for (const tab of tabs) {
      if (tab.id == null || !tab.url) continue;

      // Do not reload /mod/lti/ pages
      if (tab.url.startsWith("https://moodle.telt.unsw.edu.au/mod/lti/")) {
        continue;
      }

      // Do not reload /mod/quiz/ pages
      if (tab.url.startsWith("https://moodle.telt.unsw.edu.au/mod/quiz/")) {
        continue;
      }

      // Skip the tab you're actively using
      if (tab.active) continue;

      // Skip tabs that are currently loading
      if (tab.status === "loading") continue;

      // Reload only background Moodle tabs
      await browser.tabs.reload(tab.id);
    }
  } catch (error) {
    console.error("Failed to refresh Moodle tabs:", error);
  }
}

function ensureAlarm() {
  browser.alarms.get(ALARM_NAME).then((existing) => {
    if (!existing) {
      browser.alarms.create(ALARM_NAME, {
        periodInMinutes: PERIOD_MINUTES
      });
    }
  });
}

browser.runtime.onInstalled.addListener(() => {
  browser.alarms.clear(ALARM_NAME).then(() => {
    browser.alarms.create(ALARM_NAME, {
      periodInMinutes: PERIOD_MINUTES
    });
  });
});

browser.runtime.onStartup.addListener(() => {
  ensureAlarm();
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    refreshMoodleTabs();
  }
});