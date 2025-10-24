import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { Trash2, Clock, Globe, Loader2 } from 'lucide-react';
import {
  THRESHOLD_OPTIONS,
  DEFAULT_THRESHOLD_MS,
  type TabInfo,
  fetchInactiveTabs,
  getStoredThreshold,
  saveThreshold,
  getThresholdLabel,
  closeInactiveTabs,
  formatResultMessage,
  stripTabIds,
  getConfiguredCommands,
  getIgnoreGroupsSetting,
  saveIgnoreGroupsSetting,
} from '../lib/tab-utils';

interface TabItemProps {
  tab: Omit<TabInfo, 'id'>;
}

const TabItem: React.FC<TabItemProps> = ({ tab }) => {
  const displayText = tab.title || tab.url || "Untitled tab";
  
  return (
    <div className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors">
      <div className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {tab.favIconUrl ? (
          <img
            src={tab.favIconUrl}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <Globe className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {tab.url ? (
          <a
            href={tab.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm text-foreground hover:text-primary transition-colors truncate block"
          >
            {displayText}
          </a>
        ) : (
          <span className="text-sm text-muted-foreground truncate block">
            {displayText}
          </span>
        )}
      </div>
    </div>
  );
};

interface TabListProps {
  tabs: Omit<TabInfo, 'id'>[];
  title: string;
  isVisible: boolean;
}

const TabList: React.FC<TabListProps> = ({ tabs, title, isVisible }) => {
  if (!isVisible || tabs.length === 0) return null;

  const maxVisibleTabs = 5;
  const visibleTabs = tabs.slice(0, maxVisibleTabs);
  const remainingCount = tabs.length - maxVisibleTabs;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {tabs.length}
        </Badge>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {visibleTabs.map((tab, index) => (
          <TabItem key={`${tab.url}-${index}`} tab={tab} />
        ))}
        {remainingCount > 0 && (
          <div className="flex items-center gap-3 p-2 rounded-md border bg-muted/50">
            <div className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-muted-foreground">⋯</span>
            </div>
            <div className="flex-1">
              <span className="text-sm text-muted-foreground">
                ...and {remainingCount} other tab{remainingCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabCleaner: React.FC = () => {
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD_MS);
  const [ignoreGroups, setIgnoreGroups] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewTabs, setPreviewTabs] = useState<Omit<TabInfo, 'id'>[]>([]);
  const [closedTabs, setClosedTabs] = useState<Omit<TabInfo, 'id'>[]>([]);
  const [configuredCommands, setConfiguredCommands] = useState<Record<string, string>>({});

  // Load stored threshold and configured commands on component mount
  useEffect(() => {
    const loadData = async () => {
      const [storedThreshold, commands, storedIgnoreGroups] = await Promise.all([
        getStoredThreshold(),
        getConfiguredCommands(),
        getIgnoreGroupsSetting(),
      ]);
      setThreshold(storedThreshold);
      setIgnoreGroups(storedIgnoreGroups);
      setConfiguredCommands(commands);
    };
    loadData();
  }, []);

  // Update preview when threshold changes
  const updatePreview = useCallback(async (idleThresholdMs: number, ignoreGroupsSetting: boolean) => {
    setPreviewTabs([]);

    try {
      const { inactiveTabs } = await fetchInactiveTabs(idleThresholdMs, ignoreGroupsSetting);
      const tabsWithoutIds = stripTabIds(inactiveTabs);

      if (tabsWithoutIds.length === 0) {
        return;
      }

      setPreviewTabs(tabsWithoutIds);
    } catch (error) {
      console.error('Failed to prepare tab preview', error);
    }
  }, []);

  // Update preview when threshold or ignoreGroups changes
  useEffect(() => {
    updatePreview(threshold, ignoreGroups);
  }, [threshold, ignoreGroups, updatePreview]);

  const handleThresholdChange = async (value: string) => {
    const selectedValue = Number(value);
    
    if (Number.isFinite(selectedValue)) {
      setThreshold(selectedValue);
      await saveThreshold(selectedValue);
    }
  };

  const handleIgnoreGroupsChange = async (checked: boolean) => {
    setIgnoreGroups(checked);
    await saveIgnoreGroupsSetting(checked);
  };

  const handleCleanTabs = async () => {   
    setIsLoading(true);
    setClosedTabs([]);

    try {
      await saveThreshold(threshold);
      await saveIgnoreGroupsSetting(ignoreGroups);
      const result = await closeInactiveTabs(threshold, ignoreGroups);
      setClosedTabs(result.closedTabs);
    } catch (error) {
      console.error('Failed to clean tabs', error);
    } finally {
      setIsLoading(false);
      // Refresh preview after cleanup
      updatePreview(threshold, ignoreGroups).catch((error) => {
        console.error('Failed to refresh preview after cleanup', error);
      });
    }
  };

  return (
    <div className="w-[350px] pb-4 pt-0 space-y-4">
      <Card className="border-0 shadow-sm overflow-hidden rounded-none rounded-b-lg">
        <CardHeader className="bg-slate-900 text-white py-4">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <img 
              src="/images/icon-32.png" 
              alt="Tab Cleaner" 
              className="w-5 h-5"
            />
            Tab Cleaner
          </CardTitle>
          <CardDescription className="text-sm text-white/70">
            {configuredCommands['_execute_action'] ? (
              <>Press <kbd className="bg-white/20 text-white/80 px-1 py-0.5 rounded text-xs">{configuredCommands['_execute_action']}</kbd> to open this popup</>
            ) : (
              'Clean tabs that have been inactive for a chosen amount of time.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Consider tabs inactive after
            </label>
            <Select value={threshold.toString()} onValueChange={handleThresholdChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THRESHOLD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="ignore-groups" 
              checked={ignoreGroups}
              onCheckedChange={handleIgnoreGroupsChange}
            />
            <label 
              htmlFor="ignore-groups" 
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Ignore tabs in groups
            </label>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">
                {previewTabs.length > 0 ? 'Ready to close' : 'No tabs to close'}
              </h3>
            </div>
            
            <TabList 
              tabs={previewTabs}
              title="Tabs to be closed"
              isVisible={previewTabs.length > 0}
            />
          </div>

          <Button 
            onClick={handleCleanTabs} 
            disabled={isLoading || previewTabs.length === 0}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Clean Inactive Tabs
                {configuredCommands['quick-clean-tabs'] && (
                  <kbd className="ml-auto text-xs text-muted-foreground px-1.5 py-0.5">
                    ({configuredCommands['quick-clean-tabs']})
                  </kbd>
                )}
              </>
            )}
          </Button>

          {closedTabs.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <p className="text-sm text-foreground font-medium">
                {formatResultMessage({ removedCount: closedTabs.length }, getThresholdLabel(threshold))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TabCleaner;
