import type { FC, ReactNode } from 'react';

/**
 * The element around the router outlet. A stretching flex column with no
 * padding and no overflow: each page's PageBody owns the 20px gutter and the
 * scrolling. Full-bleed editors (workflow, automation rule) and the public
 * satisfaction survey draw edge to edge on purpose.
 */
export const PAGE_OUTLET_CLASSES = 'flex min-h-0 min-w-0 flex-1 flex-col';

export const PageOutletFrame: FC<{ children: ReactNode }> = ({ children }) => (
  <div className={PAGE_OUTLET_CLASSES} data-testid="page-outlet">
    {children}
  </div>
);
