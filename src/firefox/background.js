const ALARM_NAME = "keepalive-moodle-session";
const PERIOD_MINUTES = 30;
const MOODLE_URL = "https://moodle.telt.unsw.edu.au/*";

// Ensure alarm exists whenever background script starts
async function ensureAlarm() {
  const existing = await browser.alarms.get(ALARM_NAME);

  if (!existing) {
    await browser.alarms.create(ALARM_NAME, {
      periodInMinutes: PERIOD_MINUTES
    });
  }
}

browser.runtime.onInstalled.addListener(() => {
  ensureAlarm().catch(console.warn);
});

browser.runtime.onStartup.addListener(() => {
  ensureAlarm().catch(console.warn);
  keepMoodleSessionAlive().catch(console.warn);
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    keepMoodleSessionAlive();
  }
});

// Finds one open Moodle tab to use as the source of the session key
async function findMoodleTab() {
  const tabs = await browser.tabs.query({ url: MOODLE_URL });

  return tabs.find((candidate) => {
    if (!candidate.id) return false;

    const url = candidate.url ?? "";
    return !url.includes("/mod/quiz/") && !url.includes("/mod/lti/");
  });
}

// Runs the session keepalive for found Moodle tab
async function keepMoodleSessionAlive() {
  const tab = await findMoodleTab();

  if (!tab?.id) return;

  try {
    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: touchMoodleSession,
      world: "MAIN",
    });

    const result = results?.[0]?.result;

    if (!result?.ok) {
      console.warn("Moodle session keepalive failed:", result?.error);
    }
  } catch (error) {
    console.warn("Could not run Moodle session keepalive:", error);
  }
}

// Uses Moodle's sesskey and AJAX service to touch the current session
async function touchMoodleSession() {
  try {
    const sesskey = window.M?.cfg?.sesskey;

    if (!sesskey) {
      return {
        ok: true,
        skipped: true,
        reason: "Moodle sesskey not found",
      };
    }

    const response = await fetch(
      `/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey)}&info=core_session_touch`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            index: 0,
            methodname: "core_session_touch",
            args: {},
          },
        ]),
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const serviceResult = data?.[0];

    if (serviceResult?.error) {
      return {
        ok: false,
        error: serviceResult.exception?.message ?? "Moodle returned an error",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

ensureAlarm().catch((error) => {
  console.warn("Could not ensure Moodle keepalive alarm:", error);
});