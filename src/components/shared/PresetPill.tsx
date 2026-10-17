import type { FC } from 'react';
import { IconTip } from './IconTip';

/**
 * Marks a built-in row in a Configuration table: something Helpdesk provides
 * and the tenant can use but not edit or delete. Focusable, so the tooltip
 * explaining it opens from the keyboard as well as on hover.
 */
export const PresetPill: FC<{ hint: string }> = ({ hint }) => (
  <IconTip label={hint}>
    <span
      // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable so the tooltip also opens from the keyboard
      tabIndex={0}
      className="bg-lighter-blue text-blue cursor-default rounded-full px-2 py-0.5 text-[11px] font-medium"
    >
      Preset
    </span>
  </IconTip>
);
