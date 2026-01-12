"use client";

export interface TabInfo {
  id: string | null; // null = "New Order" tab
  label: string;
  isNewOrder: boolean;
  itemCount?: number;
  total?: number;
}

interface OrderTabsProps {
  tabs: TabInfo[];
  activeTabId: string | null;
  onTabClick: (tabId: string | null) => void; // null = "New Order" tab
}

export function OrderTabs({ tabs, activeTabId, onTabClick }: OrderTabsProps) {
  // Don't render if no tabs or only one tab
  if (tabs.length <= 1) {
    return null;
  }

  // For 2 tabs, show them in a horizontal layout matching Figma
  if (tabs.length === 2) {
    return (
      <div className="bg-[#F7F8F8] border-b border-gray-200">
        <div className="flex gap-2 px-4 py-2">
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;

            return (
              <button
                key={tab.id || 'new-order'}
                onClick={() => onTabClick(tab.id)}
                className={`
                  flex-1 flex flex-col items-start px-4 py-2 rounded-lg transition-all
                  ${
                    isActive
                      ? "bg-black text-white"
                      : "bg-gray-100 text-black hover:bg-gray-200"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  {tab.isNewOrder && <span className="text-sm">🛒</span>}
                  <span className="text-sm font-bold">
                    {tab.label}
                  </span>
                  {tab.itemCount && tab.itemCount > 0 && (
                    <span className="text-xs opacity-70">
                      {tab.itemCount} {tab.itemCount === 1 ? "item" : "items"}
                    </span>
                  )}
                </div>
                {tab.total && tab.total > 0 && (
                  <span className="text-xs opacity-70 mt-1">
                    ${tab.total.toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // For 3+ tabs, show them in a scrollable horizontal layout
  return (
    <div className="bg-[#F7F8F8] border-b border-gray-200 overflow-x-auto">
      <div className="flex gap-2 px-4 py-2 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;

          return (
            <button
              key={tab.id || 'new-order'}
              onClick={() => onTabClick(tab.id)}
              className={`
                flex flex-col items-start px-4 py-2 rounded-lg transition-all shrink-0
                ${
                  isActive
                    ? "bg-black text-white"
                    : "bg-gray-100 text-black hover:bg-gray-200"
                }
              `}
            >
              <div className="flex items-center gap-2">
                {tab.isNewOrder && <span className="text-sm">🛒</span>}
                <span className="text-sm font-bold">
                  {tab.label}
                </span>
                {tab.itemCount && tab.itemCount > 0 && (
                  <span className="text-xs opacity-70">
                    {tab.itemCount} {tab.itemCount === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
              {tab.total && tab.total > 0 && (
                <span className="text-xs opacity-70 mt-1">
                  ${tab.total.toFixed(2)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
