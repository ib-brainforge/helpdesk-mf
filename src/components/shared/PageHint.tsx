import { Icon } from '@brainforgeau/components/base';
import type { FC, ReactNode } from 'react';

/**
 * A short explanation at the top of a Configuration page: what the things on
 * it are for. A soft tinted panel with an info icon, rather than a bordered
 * card, so it reads as guidance and does not compete with the table below.
 */
export const PageHint: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="bg-lighter-blue/60 dark:bg-blue/10 flex max-w-3xl items-start gap-3 rounded-lg px-4 py-3">
    <Icon name="info" className="text-blue mt-0.5 h-4 w-4 shrink-0" />
    <p className="text-gray text-sm leading-relaxed dark:text-light">
      {children}
    </p>
  </div>
);
