import type { FC, ReactNode } from 'react';

interface KpiPanelProps {
  title: ReactNode;
  /** Muted text at the right of the header. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** The report's panel card: a title bar over its content. */
export const KpiPanel: FC<KpiPanelProps> = ({
  title,
  aside,
  children,
  className = '',
}) => (
  <section
    className={`border-default-200 dark:border-default-100 rounded-md border border-t-2 border-t-default-300 bg-white dark:bg-default-50 break-inside-avoid ${className}`}
  >
    <header className="border-default-200 flex items-center justify-between gap-3 border-b px-5 py-3">
      <h2 className="text-dark text-base font-semibold dark:text-white">
        {title}
      </h2>
      {aside && <div className="text-default-500 text-xs">{aside}</div>}
    </header>
    {children}
  </section>
);
