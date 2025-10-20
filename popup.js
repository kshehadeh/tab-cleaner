const THRESHOLD_OPTIONS = [
  { value: 15 * 60 * 1000, label: "15 minutes" },
  { value: 30 * 60 * 1000, label: "30 minutes" },
  { value: 60 * 60 * 1000, label: "1 hour" },
  { value: 2 * 60 * 60 * 1000, label: "2 hours" },
  { value: 6 * 60 * 60 * 1000, label: "6 hours" },
  { value: 24 * 60 * 60 * 1000, label: "1 day" },
];

const DEFAULT_THRESHOLD_MS = 60 * 60 * 1000;
const STORAGE_KEY = "idleThresholdMs";

async function getStoredThreshold() {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY];

    if (
      typeof value === "number" &&
      THRESHOLD_OPTIONS.some((option) => option.value === value)
    ) {
      return value;
    }
  } catch (error) {
    console.warn("Failed to read stored threshold", error);
  }

  return DEFAULT_THRESHOLD_MS;
}

async function saveThreshold(value) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: value });
  } catch (error) {
    console.warn("Failed to persist threshold", error);
  }
}

function getThresholdLabel(value) {
  const option = THRESHOLD_OPTIONS.find((entry) => entry.value === value);
  return option ? option.label : `${Math.round(value / (60 * 1000))} minutes`;
}

async function closeInactiveTabs(idleThresholdMs) {
  const now = Date.now();
  const tabs = await chrome.tabs.query({});

  const removableTabs = tabs.filter((tab) => {
    return (
      typeof tab.id === "number" &&
      typeof tab.lastAccessed === "number" &&
      now - tab.lastAccessed >= idleThresholdMs
    );
  });

  const removableTabIds = removableTabs
    .map((tab) => tab.id)
    .filter((id) => typeof id === "number");

  if (removableTabIds.length > 0) {
    await chrome.tabs.remove(removableTabIds);
  }

  const closedTabs = removableTabs.map((tab) => ({
    title: typeof tab.title === "string" && tab.title.trim().length > 0
      ? tab.title
      : "Untitled tab",
    url: typeof tab.url === "string" ? tab.url : "",
  }));

  return {
    removedCount: removableTabIds.length,
    checkedCount: tabs.length,
    closedTabs,
  };
}

function formatResultMessage({ removedCount }, thresholdLabel) {
  if (removedCount === 0) {
    return `No tabs have been inactive for at least ${thresholdLabel}.`;
  }

  if (removedCount === 1) {
    return `Closed 1 tab that was inactive for over ${thresholdLabel}.`;
  }

  return `Closed ${removedCount} tabs that were inactive for over ${thresholdLabel}.`;
}

function renderClosedTabs(listElement, tabs) {
  listElement.innerHTML = "";

  if (!Array.isArray(tabs) || tabs.length === 0) {
    listElement.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  tabs.forEach((tab) => {
    const listItem = document.createElement("li");
    const title = tab.title || tab.url || "Untitled tab";

    if (tab.url) {
      const link = document.createElement("a");
      link.href = tab.url;
      link.textContent = title;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      listItem.appendChild(link);
    } else {
      listItem.textContent = title;
    }

    fragment.appendChild(listItem);
  });

  listElement.appendChild(fragment);
  listElement.hidden = false;
}

async function setupPopup() {
  const button = document.getElementById("clean-button");
  const status = document.getElementById("status");
  const thresholdSelect = document.getElementById("idle-threshold");
  const closedTabsList = document.getElementById("closed-tabs");

  if (!button || !status || !thresholdSelect || !closedTabsList) {
    return;
  }

  const setStatus = (message) => {
    status.textContent = message;
  };

  const clearClosedTabs = () => {
    renderClosedTabs(closedTabsList, []);
  };

  const storedThreshold = await getStoredThreshold();
  thresholdSelect.value = String(storedThreshold);

  thresholdSelect.addEventListener("change", async () => {
    const selectedValue = Number(thresholdSelect.value);

    if (Number.isFinite(selectedValue)) {
      await saveThreshold(selectedValue);
    }
  });

  button.addEventListener("click", async () => {
    const selectedValue = Number(thresholdSelect.value) || DEFAULT_THRESHOLD_MS;
    const thresholdLabel = getThresholdLabel(selectedValue);

    button.disabled = true;
    setStatus("Scanning tabs...");
    clearClosedTabs();

    try {
      await saveThreshold(selectedValue);
      const result = await closeInactiveTabs(selectedValue);
      setStatus(formatResultMessage(result, thresholdLabel));
      renderClosedTabs(closedTabsList, result.closedTabs);
    } catch (error) {
      console.error("Failed to clean tabs", error);
      setStatus("Something went wrong while cleaning tabs.");
    } finally {
      button.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPopup().catch((error) => {
    console.error("Failed to initialize popup", error);
  });
});
