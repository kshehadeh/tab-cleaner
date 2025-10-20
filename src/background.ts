// Background script for Tab Cleaner extension
// Handles keyboard shortcuts for quick tab cleaning

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

const NON_APP_WINDOW_TYPES: chrome.windows.windowTypeEnum[] = [
  "normal",
  "popup",
  "panel",
];

async function queryTabsExcludingApps() {
  const tabGroups = await Promise.all(
    NON_APP_WINDOW_TYPES.map((windowType) =>
      chrome.tabs.query({ windowType }),
    ),
  );

  return tabGroups.flat();
}

function normalizeTab(tab: chrome.tabs.Tab) {
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

async function fetchInactiveTabs(idleThresholdMs: number) {
  const now = Date.now();
  const tabs = await queryTabsExcludingApps();

  const inactiveTabs = tabs
    .filter((tab) => {
      return (
        typeof tab.id === "number" &&
        typeof (tab as any).lastAccessed === "number" &&
        now - (tab as any).lastAccessed >= idleThresholdMs
      );
    })
    .map(normalizeTab);

  return {
    inactiveTabs,
    checkedCount: tabs.length,
  };
}

async function getStoredThreshold(): Promise<number> {
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

function getThresholdLabel(value: number): string {
  const option = THRESHOLD_OPTIONS.find((entry) => entry.value === value);
  return option ? option.label : `${Math.round(value / (60 * 1000))} minutes`;
}

async function closeInactiveTabs(idleThresholdMs: number) {
  const { inactiveTabs, checkedCount } = await fetchInactiveTabs(
    idleThresholdMs,
  );

  const removableTabIds = inactiveTabs
    .map((tab) => tab.id)
    .filter((id) => typeof id === "number") as number[];

  if (removableTabIds.length > 0) {
    await chrome.tabs.remove(removableTabIds);
  }

  const closedTabs = inactiveTabs.map(({ id, ...rest }) => rest);

  return {
    removedCount: removableTabIds.length,
    checkedCount,
    closedTabs,
  };
}

function formatResultMessage({ removedCount }: { removedCount: number }, thresholdLabel: string): string {
  if (removedCount === 0) {
    return `No tabs have been inactive for at least ${thresholdLabel}.`;
  }

  if (removedCount === 1) {
    return `Closed 1 tab that was inactive for over ${thresholdLabel}.`;
  }

  return `Closed ${removedCount} tabs that were inactive for over ${thresholdLabel}.`;
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-clean-tabs') {
    try {
      // Get the stored threshold or use default
      const threshold = await getStoredThreshold();
      const thresholdLabel = getThresholdLabel(threshold);
      
      // Execute the same logic as the button click
      const result = await closeInactiveTabs(threshold);
      
      // Show notification with result
      const message = formatResultMessage(result, thresholdLabel);
      
      // Create notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon-48.png',
        title: 'Tab Cleaner',
        message: message,
      });
      
    } catch (error) {
      console.error('Failed to clean tabs via command', error);
      
      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon-48.png',
        title: 'Tab Cleaner',
        message: 'Something went wrong while cleaning tabs.',
      });
    }
  }
});
