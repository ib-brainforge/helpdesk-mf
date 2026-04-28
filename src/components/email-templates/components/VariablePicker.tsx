import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { BaseButton, Icon } from '@brainforgeau/components';
import { TEMPLATE_VARIABLES, type TemplateVariableCategory } from '@/types/email-template';
import { addToast } from '@heroui/react';

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
        : [...prev, categoryName],
    );
  };

  const handleCopyVariable = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    addToast({
      title: 'Variable copied',
      description: `${placeholder} copied to clipboard`,
      severity: 'success',
    });
    if (onVariableSelect) {
      onVariableSelect(placeholder);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <h3 className="text-sm font-semibold">Template Variables</h3>
      </CardHeader>
      <CardBody className="overflow-y-auto">
        <div className="flex flex-col gap-2">
          {TEMPLATE_VARIABLES.map((category: TemplateVariableCategory) => (
            <div key={category.name} className="border-b border-gray-200 pb-2 last:border-b-0 dark:border-gray-700">
              <button
                type="button"
                onClick={() => toggleCategory(category.name)}
                className="flex w-full items-center justify-between py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="text-sm font-medium">{category.name}</span>
                <Icon
                  name={expandedCategories.includes(category.name) ? 'chevron-up' : 'chevron-down'}
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
                      className="group flex flex-col rounded p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                      title={variable.description}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {variable.name}
                        </span>
                        <Icon
                          name="clipboard"
                          className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100"
                        />
                      </div>
                      <code className="text-xs text-gray-500 dark:text-gray-400">
                        {variable.placeholder}
                      </code>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {variable.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};
