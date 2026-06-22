import {
  TEMPLATE_VARIABLES,
  type TemplateVariableCategory,
} from '@/types/email-template';
import { BaseButton, BaseCard, Icon } from '@brainforgeau/components';
import { Card, CardContent, CardHeader, toast } from '@heroui/react';
import { useState } from 'react';

interface VariablePickerProps {
  onVariableSelect?: (placeholder: string) => void;
}

export const VariablePicker = ({ onVariableSelect }: VariablePickerProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'Ticket',
    'User',
  ]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleCopyVariable = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    toast('Variable copied', {
      description: `${placeholder} copied to clipboard`,
      variant: 'success',
    });
    if (onVariableSelect) {
      onVariableSelect(placeholder);
    }
  };

  return (
    <BaseCard className="h-full">
      <h3 className="text-sm font-semibold">Template Variables</h3>
      <div className="flex flex-col gap-2">
        {TEMPLATE_VARIABLES.map((category: TemplateVariableCategory) => (
          <div
            key={category.name}
            className="border-b border-default-200 pb-2 last:border-b-0 dark:border-default-700"
          >
            <button
              type="button"
              onClick={() => toggleCategory(category.name)}
              className="flex w-full items-center justify-between py-2 text-left hover:bg-default-50 dark:hover:bg-default-100"
            >
              <span className="text-sm font-medium">{category.name}</span>
              <Icon
                name={
                  expandedCategories.includes(category.name)
                    ? 'chevron-up'
                    : 'chevron-down'
                }
                className="h-4 w-4"
              />
            </button>

            {expandedCategories.includes(category.name) && (
              <div className="mt-1 flex flex-col gap-1">
                {category.variables.map((variable) => (
                  <button
                    key={variable.placeholder}
                    type="button"
                    onClick={() => handleCopyVariable(variable.placeholder)}
                    className="group flex flex-col rounded p-2 text-left hover:bg-default-100 dark:hover:bg-default-100"
                    title={variable.description}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-default-700 dark:text-default-300">
                        {variable.name}
                      </span>
                      <Icon
                        name="clipboard"
                        className="h-3 w-3 text-default-400 opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </div>
                    <code className="text-xs text-default-500 dark:text-default-400">
                      {variable.placeholder}
                    </code>
                    <span className="text-xs text-default-400 dark:text-default-500">
                      {variable.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </BaseCard>
  );
};
