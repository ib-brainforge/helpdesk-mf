import { BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import type { FC } from 'react';
import { monthOptions } from './kpiFormat';

/**
 * The reports' Period: this month so far, then the twelve before it. One
 * picker for Overview and Team, so both offer and default to the same months
 * (see defaultMonth).
 */
export const PeriodPicker: FC<{
  value: string;
  onChange: (month: string) => void;
}> = ({ value, onChange }) => (
  <BaseSelect
    label="Period"
    className="w-48"
    selectedKey={value}
    onSelectionChange={key => key && onChange(String(key))}
  >
    {monthOptions().map(o => (
      <BaseSelectItem key={o.key} id={o.key} textValue={o.label}>
        {o.label}
      </BaseSelectItem>
    ))}
  </BaseSelect>
);
