import { useState, type FC } from 'react';
import { DateRangePicker } from '@heroui/react';
import { BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import type { DateValue } from '@internationalized/date';

// REVIEW: Using controlled component pattern with callback for parent state updates
interface DateRangeSelectorProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}

const PRESET_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export const DateRangeSelector: FC<DateRangeSelectorProps> = ({
  startDate,
  endDate,
  onChange,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('last30');
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);

    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (preset) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'last7':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisQuarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      }
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        setShowCustom(true);
        return;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    setShowCustom(false);
    onChange(start.toISOString(), end.toISOString());
  };

  const handleCustomRangeChange = (range: { start: DateValue; end: DateValue } | null) => {
    if (range?.start && range?.end) {
      // Convert CalendarDate to ISO string
      const startDate = new Date(range.start.year, range.start.month - 1, range.start.day);
      const endDate = new Date(range.end.year, range.end.month - 1, range.end.day);
      onChange(startDate.toISOString(), endDate.toISOString());
    }
  };

  return (
    <div className="flex gap-4">
      <BaseSelect
        selectedKeys={new Set([selectedPreset])}
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0] as string;
          handlePresetChange(key);
        }}
        placeholder="Select date range"
        className="w-48"
      >
        {PRESET_RANGES.map((range) => (
          <BaseSelectItem key={range.value}>{range.label}</BaseSelectItem>
        ))}
      </BaseSelect>

      {showCustom && (
        <DateRangePicker
          label="Custom Date Range"
          onChange={handleCustomRangeChange}
          className="w-80"
        />
      )}
    </div>
  );
};
