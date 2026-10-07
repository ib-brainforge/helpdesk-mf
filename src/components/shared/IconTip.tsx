import { BaseTooltip } from '@brainforgeau/components';
import type { FC, ReactNode } from 'react';

/**
 * The tooltip every icon-only control in Helpdesk uses, so they all behave
 * the same: it opens after 300ms (the library default is 1.5s, long enough
 * that people give up and click to find out) and sits above the control.
 *
 * Wrap a single focusable control. The tooltip text should say what pressing
 * it does, the same words as its aria-label.
 */
export const IconTip: FC<{ label: ReactNode; children: ReactNode }> = ({
  label,
  children,
}) => (
  <BaseTooltip content={label} delay={300} closeDelay={0}>
    {children}
  </BaseTooltip>
);
