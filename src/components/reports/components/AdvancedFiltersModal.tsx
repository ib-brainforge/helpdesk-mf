import type { CategoryDto } from '@/types/category';
import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseTagSelect,
  BaseTagSelectItem,
} from '@brainforgeau/components';
import { type FC, useState } from 'react';
import { DateRangeSelector } from './DateRangeSelector';

export interface AdvancedFilterValues {
  startDate: string;
  endDate: string;
  statuses: string[];
  priorities: string[];
  categoryIds: string[];
  assigneeIds: string[];
}

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  initialValues: AdvancedFilterValues;
  categories: CategoryDto[];
  // REVIEW: Assignees would come from a useAgentsQuery hook when available; omitted for now
  onApply: (values: AdvancedFilterValues) => void;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'OnHold', label: 'On Hold' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Normal', label: 'Normal' },
  { value: 'Low', label: 'Low' },
  { value: 'None', label: 'None' },
];

export const AdvancedFiltersModal: FC<AdvancedFiltersModalProps> = ({
  isOpen,
  initialValues,
  categories,
  onApply,
  onClose,
}) => {
  const [values, setValues] = useState<AdvancedFilterValues>(initialValues);

  const handleDateChange = (startDate: string, endDate: string) => {
    setValues(v => ({ ...v, startDate, endDate }));
  };

  const handleApply = () => {
    onApply(values);
    onClose();
  };

  const handleReset = () => {
    const defaultValues: AdvancedFilterValues = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      statuses: [],
      priorities: [],
      categoryIds: [],
      assigneeIds: [],
    };
    setValues(defaultValues);
  };

  const activeFilterCount = [
    values.statuses.length > 0,
    values.priorities.length > 0,
    values.categoryIds.length > 0,
  ].filter(Boolean).length;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg" className="max-w-xl">
      <BaseModalContent>
        <BaseModalHeader>
          <div className="flex items-center gap-2">
            <span>Advanced Filters</span>
            {activeFilterCount > 0 && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>
        </BaseModalHeader>
        <BaseModalBody>
          <div className="space-y-5">
            {/* Date Range */}
            <div>
              <p className="text-sm font-medium mb-2">Date range</p>
              <DateRangeSelector
                startDate={values.startDate}
                endDate={values.endDate}
                onChange={handleDateChange}
              />
            </div>

            {/* Status */}
            <div>
              <p className="text-sm font-medium mb-2">Status</p>
              <BaseTagSelect
                label="Filter by status"
                placeholder="All statuses"
                value={values.statuses}
                onValueChange={statuses => setValues(v => ({ ...v, statuses }))}
                classNames={{ base: "w-full" }}
              >
                {STATUS_OPTIONS.map(opt => (
                  <BaseTagSelectItem key={opt.value} value={opt.value}>{opt.label}</BaseTagSelectItem>
                ))}
              </BaseTagSelect>
            </div>

            {/* Priority */}
            <div>
              <p className="text-sm font-medium mb-2">Priority</p>
              <BaseTagSelect
                label="Filter by priority"
                placeholder="All priorities"
                value={values.priorities}
                onValueChange={priorities => setValues(v => ({ ...v, priorities }))}
                classNames={{ base: "w-full" }}
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <BaseTagSelectItem key={opt.value} value={opt.value}>{opt.label}</BaseTagSelectItem>
                ))}
              </BaseTagSelect>
            </div>

            {/* Category */}
            <div>
              <p className="text-sm font-medium mb-2">Category</p>
              <BaseTagSelect
                label="Filter by category"
                placeholder="All categories"
                value={values.categoryIds}
                onValueChange={categoryIds => setValues(v => ({ ...v, categoryIds }))}
                classNames={{ base: "w-full" }}
              >
                {categories.map(cat => (
                  <BaseTagSelectItem key={cat.id} value={cat.id}>{cat.name}</BaseTagSelectItem>
                ))}
              </BaseTagSelect>
            </div>
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="light" onPress={handleReset}>
            Reset
          </BaseButton>
          <BaseButton variant="bordered" onPress={onClose}>
            Cancel
          </BaseButton>
          <BaseButton color="primary" onPress={handleApply}>
            Apply filters
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
