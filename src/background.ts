// Background script for Tab Magic extension
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
const IGNORE_GROUPS_STORAGE_KEY = "ignoreTabsInGroups";

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

async function fetchInactiveTabs(idleThresholdMs: number, ignoreGroups: boolean = false) {
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

async function getIgnoreGroupsSetting(): Promise<boolean> {
  try {
    const stored = await chrome.storage.local.get(IGNORE_GROUPS_STORAGE_KEY);
    return stored[IGNORE_GROUPS_STORAGE_KEY] === true;
  } catch (error) {
    console.warn("Failed to read ignore groups setting", error);
    return false;
  }
}

function getThresholdLabel(value: number): string {
  const option = THRESHOLD_OPTIONS.find((entry) => entry.value === value);
  return option ? option.label : `${Math.round(value / (60 * 1000))} minutes`;
}

async function closeInactiveTabs(idleThresholdMs: number, ignoreGroups: boolean = false) {
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

// Get configured keyboard shortcuts
async function getConfiguredCommands() {
  try {
    const commands = await chrome.commands.getAll();
    const commandMap: Record<string, string> = {};
    
    commands.forEach(command => {
      if (command.shortcut && command.name) {
        commandMap[command.name] = command.shortcut;
      }
    });
    
    return commandMap;
  } catch (error) {
    console.warn('Failed to get configured commands', error);
    return {};
  }
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-clean-tabs') {
    try {
      // Get the stored threshold and ignore groups setting
      const [threshold, ignoreGroups] = await Promise.all([
        getStoredThreshold(),
        getIgnoreGroupsSetting(),
      ]);
      const thresholdLabel = getThresholdLabel(threshold);
      
      // Execute the same logic as the button click
      const result = await closeInactiveTabs(threshold, ignoreGroups);
      
      // Show notification with result
      const message = formatResultMessage(result, thresholdLabel);
      
      // Create notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon-48.png',
        title: 'Tab Magic',
        message: message,
      });
      
    } catch (error) {
      console.error('Failed to clean tabs via command', error);
      
      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon-48.png',
        title: 'Tab Magic',
        message: 'Something went wrong while cleaning tabs.',
      });
    }
  } else if (command === 'copy-current-tab-url') {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.url) {
        const url = tab.url;
        
        // Use chrome.scripting to execute clipboard copy and show notification in the tab's context
        if (tab.id) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (textToCopy: string) => {
                // Copy to clipboard
                navigator.clipboard.writeText(textToCopy);
                
                // Create and show in-page notification
                const notification = document.createElement('div');
                notification.style.cssText = `
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: #10b981;
                  color: white;
                  padding: 16px 24px;
                  border-radius: 8px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
                  z-index: 2147483647;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  font-size: 14px;
                  font-weight: 500;
                  max-width: 400px;
                  word-break: break-all;
                  animation: slideIn 0.3s ease-out;
                `;
                
                // Add animation keyframes
                const style = document.createElement('style');
                style.textContent = `
                  @keyframes slideIn {
                    from {
                      transform: translateX(400px);
                      opacity: 0;
                    }
                    to {
                      transform: translateX(0);
                      opacity: 1;
                    }
                  }
                  @keyframes slideOut {
                    from {
                      transform: translateX(0);
                      opacity: 1;
                    }
                    to {
                      transform: translateX(400px);
                      opacity: 0;
                    }
                  }
                `;
                document.head.appendChild(style);
                
                notification.innerHTML = `
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
                    </svg>
                    <div>
                      <div style="font-weight: 600; margin-bottom: 4px;">URL Copied!</div>
                      <div style="font-size: 12px; opacity: 0.9;">${textToCopy.length > 60 ? textToCopy.substring(0, 57) + '...' : textToCopy}</div>
                    </div>
                  </div>
                `;
                
                document.body.appendChild(notification);
                
                // Remove notification after 3 seconds
                setTimeout(() => {
                  notification.style.animation = 'slideOut 0.3s ease-in';
                  setTimeout(() => {
                    document.body.removeChild(notification);
                    document.head.removeChild(style);
                  }, 300);
                }, 3000);
              },
              args: [url]
            });
          } catch (scriptError) {
            // If script injection fails (e.g., on restricted pages), show browser notification
            console.warn('Script injection failed, falling back to browser notification:', scriptError);
            
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'images/icon-48.png',
              title: 'Tab Magic',
              message: `URL: ${url}`,
            });
          }
        }
      } else {
        // No tab found - show browser notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon-48.png',
          title: 'Tab Magic',
          message: 'Could not get current tab URL.',
        });
      }
    } catch (error) {
      console.error('Failed to copy URL via command', error);
      
      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon-48.png',
        title: 'Tab Magic',
        message: 'Something went wrong while copying URL.',
      });
    }
  } else if (command === 'duplicate-current-tab') {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.id) {
        // Duplicate the tab
        await chrome.tabs.duplicate(tab.id);
      } else {
        // No tab found - show browser notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon-48.png',
          title: 'Tab Magic',
          message: 'Could not duplicate tab. No active tab found.',
        });
      }
    } catch (error) {
      console.error('Failed to duplicate tab via command', error);
      
      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon-48.png',
        title: 'Tab Magic',
        message: 'Something went wrong while duplicating tab.',
      });
    }
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getCommands') {
    getConfiguredCommands().then(commands => {
      sendResponse(commands);
    });
    return true; // Indicates we will send a response asynchronously
  }
});
