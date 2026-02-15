import { ReactNode, useCallback, useEffect, useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  storageKey?: string;
  defaultExpanded?: boolean;
  /** Controlled expanded state — overrides internal state when provided */
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  /** Optional badge count shown next to the title */
  badge?: number;
}

function readStorage(key: string): boolean | null {
  try {
    const val = localStorage.getItem(key);
    if (val === 'true') return true;
    if (val === 'false') return false;
  } catch {}
  return null;
}

export function CollapsibleSection({
  title,
  children,
  storageKey,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  badge,
}: CollapsibleSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(() => {
    if (storageKey) {
      const stored = readStorage(storageKey);
      if (stored !== null) return stored;
    }
    return defaultExpanded;
  });

  const isExpanded = controlledExpanded ?? internalExpanded;

  const toggle = useCallback(() => {
    const next = !isExpanded;
    setInternalExpanded(next);
    onToggle?.(next);
  }, [isExpanded, onToggle]);

  // Persist to localStorage when internal state changes
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, String(internalExpanded));
      } catch {}
    }
  }, [storageKey, internalExpanded]);

  return (
    <section>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs font-semibold text-[--text-secondary] hover:text-[--text-primary] transition-colors duration-150"
      >
        <svg
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent/20 px-1 text-[10px] font-medium text-accent">
            {badge}
          </span>
        )}
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="pt-4 space-y-5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
