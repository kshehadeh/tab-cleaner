const HOUR_IN_MS = 60 * 60 * 1000;

async function closeInactiveTabs() {
  const now = Date.now();
  const tabs = await chrome.tabs.query({});

  const removableTabIds = tabs
    .filter((tab) => typeof tab.id === "number")
    .filter((tab) => typeof tab.lastAccessed === "number")
    .filter((tab) => now - tab.lastAccessed >= HOUR_IN_MS)
    .map((tab) => tab.id);

  if (removableTabIds.length === 0) {
    return { removedCount: 0, checkedCount: tabs.length };
  }

  await chrome.tabs.remove(removableTabIds);

  return { removedCount: removableTabIds.length, checkedCount: tabs.length };
}

function formatResultMessage({ removedCount }) {
  if (removedCount === 0) {
    return "No tabs have been inactive for at least an hour.";
  }

  if (removedCount === 1) {
    return "Closed 1 tab that was inactive for over an hour.";
  }

  return `Closed ${removedCount} tabs that were inactive for over an hour.`;
}

function setupPopup() {
  const button = document.getElementById("clean-button");
  const status = document.getElementById("status");

  if (!button || !status) {
    return;
  }

  const setStatus = (message) => {
    status.textContent = message;
  };

  button.addEventListener("click", async () => {
    button.disabled = true;
    setStatus("Scanning tabs...");

    try {
      const result = await closeInactiveTabs();
      setStatus(formatResultMessage(result));
    } catch (error) {
      console.error("Failed to clean tabs", error);
      setStatus("Something went wrong while cleaning tabs.");
    } finally {
      button.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", setupPopup);
