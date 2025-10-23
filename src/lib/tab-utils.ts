export const THRESHOLD_OPTIONS = [
  { value: 15 * 60 * 1000, label: "15 minutes" },
  { value: 30 * 60 * 1000, label: "30 minutes" },
  { value: 60 * 60 * 1000, label: "1 hour" },
  { value: 2 * 60 * 60 * 1000, label: "2 hours" },
  { value: 6 * 60 * 60 * 1000, label: "6 hours" },
  { value: 24 * 60 * 60 * 1000, label: "1 day" },
];

export const DEFAULT_THRESHOLD_MS = 60 * 60 * 1000;
export const STORAGE_KEY = "idleThresholdMs";
export const IGNORE_GROUPS_STORAGE_KEY = "ignoreTabsInGroups";

export interface TabInfo {
  id: number | null;
  title: string;
  url: string;
  favIconUrl: string;
}

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

export function normalizeTab(tab: chrome.tabs.Tab): TabInfo {
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

export async function fetchInactiveTabs(idleThresholdMs: number, ignoreGroups: boolean = false) {
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
    .filter((tab) => {
      // If ignoreGroups is true, skip tabs that are in groups
      // Tabs not in groups have groupId: -1, tabs in groups have groupId >= 0
      if (ignoreGroups && typeof tab.groupId === "number" && tab.groupId > -1) {
        return false;
      }
      return true;
    })
    .map(normalizeTab);

  return {
    inactiveTabs,
    checkedCount: tabs.length,
  };
}

export function stripTabIds(tabs: TabInfo[]): Omit<TabInfo, 'id'>[] {
  return tabs.map(({ id, ...rest }) => rest);
}

export async function getStoredThreshold(): Promise<number> {
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

export async function saveThreshold(value: number): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: value });
  } catch (error) {
    console.warn("Failed to persist threshold", error);
  }
}

export async function getIgnoreGroupsSetting(): Promise<boolean> {
  try {
    const stored = await chrome.storage.local.get(IGNORE_GROUPS_STORAGE_KEY);
    return stored[IGNORE_GROUPS_STORAGE_KEY] === true;
  } catch (error) {
    console.warn("Failed to read ignore groups setting", error);
    return false;
  }
}

export async function saveIgnoreGroupsSetting(value: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [IGNORE_GROUPS_STORAGE_KEY]: value });
  } catch (error) {
    console.warn("Failed to persist ignore groups setting", error);
  }
}

export function getThresholdLabel(value: number): string {
  const option = THRESHOLD_OPTIONS.find((entry) => entry.value === value);
  return option ? option.label : `${Math.round(value / (60 * 1000))} minutes`;
}

export async function closeInactiveTabs(idleThresholdMs: number, ignoreGroups: boolean = false) {
  const { inactiveTabs, checkedCount } = await fetchInactiveTabs(
    idleThresholdMs,
    ignoreGroups,
  );

  const removableTabIds = inactiveTabs
    .map((tab) => tab.id)
    .filter((id) => typeof id === "number") as number[];

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

export function formatResultMessage({ removedCount }: { removedCount: number }, thresholdLabel: string): string {
  if (removedCount === 0) {
    return `No tabs have been inactive for at least ${thresholdLabel}.`;
  }

  if (removedCount === 1) {
    return `Closed 1 tab that was inactive for over ${thresholdLabel}.`;
  }

  return `Closed ${removedCount} tabs that were inactive for over ${thresholdLabel}.`;
}

export function formatPreviewMessage(count: number, thresholdLabel: string): string {
  if (count === 0) {
    return `No tabs have been inactive for at least ${thresholdLabel}.`;
  }

  if (count === 1) {
    return `1 tab has been inactive for at least ${thresholdLabel} and would be closed.`;
  }

  return `${count} tabs have been inactive for at least ${thresholdLabel} and would be closed.`;
}

// Get configured keyboard shortcuts from background script
export async function getConfiguredCommands(): Promise<Record<string, string>> {
  try {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getCommands' }, (response) => {
        resolve(response || {});
      });
    });
  } catch (error) {
    console.warn('Failed to get configured commands', error);
    return {};
  }
}
