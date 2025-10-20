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

function normalizeTab(tab) {
  return {
    id: typeof tab.id === "number" ? tab.id : null,
    title:
      typeof tab.title === "string" && tab.title.trim().length > 0
        ? tab.title.trim()
        : "",
    url: typeof tab.url === "string" ? tab.url : "",
    favIconUrl:
      typeof tab.favIconUrl === "string" && tab.favIconUrl.trim().length > 0
        ? tab.favIconUrl
        : "",
  };
}

async function fetchInactiveTabs(idleThresholdMs) {
  const now = Date.now();
  const tabs = await chrome.tabs.query({});

  const inactiveTabs = tabs
    .filter((tab) => {
      return (
        typeof tab.id === "number" &&
        typeof tab.lastAccessed === "number" &&
        now - tab.lastAccessed >= idleThresholdMs
      );
    })
    .map(normalizeTab);

  return {
    inactiveTabs,
    checkedCount: tabs.length,
  };
}

function stripTabIds(tabs) {
  return tabs.map(({ id, ...rest }) => rest);
}

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
  const { inactiveTabs, checkedCount } = await fetchInactiveTabs(
    idleThresholdMs,
  );

  const removableTabIds = inactiveTabs
    .map((tab) => tab.id)
    .filter((id) => typeof id === "number");

  if (removableTabIds.length > 0) {
    await chrome.tabs.remove(removableTabIds);
  }

  const closedTabs = stripTabIds(inactiveTabs);

  return {
    removedCount: removableTabIds.length,
    checkedCount,
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

function formatPreviewMessage(count, thresholdLabel) {
  if (count === 0) {
    return `No tabs have been inactive for at least ${thresholdLabel}.`;
  }

  if (count === 1) {
    return `1 tab has been inactive for at least ${thresholdLabel} and would be closed.`;
  }

  return `${count} tabs have been inactive for at least ${thresholdLabel} and would be closed.`;
}

function renderTabList(listElement, tabs) {
  listElement.innerHTML = "";

  if (!Array.isArray(tabs) || tabs.length === 0) {
    listElement.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  tabs.forEach((tab) => {
    const listItem = document.createElement("li");
    listItem.className = "tab-item";

    const icon = document.createElement("span");
    icon.className = "tab-icon";

    if (typeof tab.favIconUrl === "string" && tab.favIconUrl.length > 0) {
      const image = document.createElement("img");
      image.src = tab.favIconUrl;
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      image.loading = "lazy";
      icon.appendChild(image);
    } else {
      icon.classList.add("tab-icon--empty");
    }

    listItem.appendChild(icon);

    const title =
      typeof tab.title === "string" && tab.title.trim().length > 0
        ? tab.title
        : "";
    const url = typeof tab.url === "string" ? tab.url : "";
    const displayText = title || url || "Untitled tab";

    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.textContent = displayText;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      listItem.appendChild(link);
    } else {
      listItem.appendChild(document.createTextNode(displayText));
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
  const previewStatus = document.getElementById("preview-status");
  const previewTabsList = document.getElementById("preview-tabs");
  const closedTabsList = document.getElementById("closed-tabs");
  const closedHeading = document.getElementById("closed-heading");

  if (
    !button ||
    !status ||
    !thresholdSelect ||
    !previewStatus ||
    !previewTabsList ||
    !closedTabsList ||
    !closedHeading
  ) {
    return;
  }

  const setStatus = (message) => {
    status.textContent = message;
  };

  const setPreviewStatus = (message) => {
    previewStatus.textContent = message;
  };

  const renderClosedTabs = (tabs) => {
    renderTabList(closedTabsList, tabs);
    closedHeading.hidden = !Array.isArray(tabs) || tabs.length === 0;
  };

  const clearClosedTabs = () => {
    renderClosedTabs([]);
  };

  let previewRequestId = 0;

  const updatePreview = async (idleThresholdMs) => {
    const thresholdLabel = getThresholdLabel(idleThresholdMs);
    const requestId = ++previewRequestId;

    setPreviewStatus("Checking tabs...");
    renderTabList(previewTabsList, []);

    try {
      const { inactiveTabs } = await fetchInactiveTabs(idleThresholdMs);
      if (requestId !== previewRequestId) {
        return;
      }
      const tabsWithoutIds = stripTabIds(inactiveTabs);

      if (tabsWithoutIds.length === 0) {
        setPreviewStatus(
          `No tabs have been inactive for at least ${thresholdLabel}.`,
        );
        return;
      }

      setPreviewStatus(
        formatPreviewMessage(tabsWithoutIds.length, thresholdLabel),
      );
      renderTabList(previewTabsList, tabsWithoutIds);
    } catch (error) {
      console.error("Failed to prepare tab preview", error);
      if (requestId === previewRequestId) {
        setPreviewStatus("Couldn't check tabs right now.");
      }
    }
  };

  const storedThreshold = await getStoredThreshold();
  thresholdSelect.value = String(storedThreshold);
  await updatePreview(storedThreshold);

  thresholdSelect.addEventListener("change", async () => {
    const selectedValue = Number(thresholdSelect.value);

    if (Number.isFinite(selectedValue)) {
      await saveThreshold(selectedValue);
      await updatePreview(selectedValue);
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
      renderClosedTabs(result.closedTabs);
    } catch (error) {
      console.error("Failed to clean tabs", error);
      setStatus("Something went wrong while cleaning tabs.");
    } finally {
      button.disabled = false;
      updatePreview(selectedValue).catch((error) => {
        console.error("Failed to refresh preview after cleanup", error);
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPopup().catch((error) => {
    console.error("Failed to initialize popup", error);
  });
});
