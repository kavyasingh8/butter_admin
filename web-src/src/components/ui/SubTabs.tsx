import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Tab<T extends string = string> {
  id: T;
  label: string;
  icon?: string;
  count?: number;
}

interface SubTabsProps<T extends string> {
  tabs: Tab<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
  tabClassName?: string;
  fullWidth?: boolean;
}

export const SubTabs = <T extends string>({
  tabs,
  activeTab,
  onChange,
  className,
  tabClassName,
  fullWidth,
}: SubTabsProps<T>) => {
  // Generate a unique layout ID based on the tab IDs to avoid conflicts between different instances
  // We use the joined IDs as a stable key so that array literal recreation doesn't bust the memo
  const tabKeys = tabs.map((t) => t.id).join('-');
  const layoutId = React.useMemo(() => `tab-bg-${tabKeys}`, [tabKeys]);

  return (
    <div
      className={cn(
        'flex gap-1 bg-black/20 p-1 rounded-xl border border-white/5',
        fullWidth ? 'w-full' : 'w-fit',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-4 py-2 rounded-lg font-rajdhani font-bold tracking-wider uppercase text-xs transition-colors duration-300 flex items-center gap-2 outline-none group justify-center',
              fullWidth ? 'flex-1' : '',
              isActive ? 'text-white' : 'text-primary/80 hover:text-primary',
              tabClassName,
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-accent rounded-lg"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon && (
                <i
                  className={cn(
                    tab.icon,
                    'text-xs transition-transform duration-300',
                    isActive ? 'scale-110' : 'group-hover:scale-110',
                  )}
                ></i>
              )}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-colors duration-300',
                    isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-primary/80 group-hover:text-primary',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};
