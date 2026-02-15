import { useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, Icon, BaseInput } from '@brainforgeau/components';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { addToast } from '@heroui/react';

function CustomPrioritiesPage() {
  const [priorityName, setPriorityName] = useState('');

  const handleAdd = () => {
    if (!priorityName.trim()) {
      addToast({
        title: 'Validation error',
        description: 'Please enter a priority name',
        severity: 'warning',
      });
      return;
    }

    addToast({
      title: 'Backend not available',
      description: 'Custom priorities API is not yet implemented',
      severity: 'warning',
    });
    setPriorityName('');
  };

  return (
    <>
      <Helmet>
        <title>Custom Priorities - Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Configuration', href: '/configuration' },
            { label: 'Custom Priorities', href: '/configuration/custom-priorities', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Custom Priorities</h1>
        <p className="text-default-500 mt-1">
          Create and manage custom priority levels for your helpdesk tickets
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="mb-6 p-4 bg-default-50 rounded-lg border border-default-200">
          <p className="text-sm text-default-700 mb-4">
            Custom priorities allow you to define specific priority levels beyond the default
            options (Critical, High, Normal, Low). Use this to match your organization's workflow.
          </p>
          <div className="flex items-end gap-3">
            <BaseInput
              label="Priority Name"
              placeholder="Enter priority name..."
              value={priorityName}
              onChange={(e) => setPriorityName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd();
                }
              }}
              className="flex-1"
            />
            <BaseButton
              color="primary"
              onPress={handleAdd}
              icon={<Icon name="plus" className="h-4 w-4" />}
            >
              Add
            </BaseButton>
          </div>
        </div>

        {/* REVIEW: Mock data placeholder - replace when backend is ready */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-default-100 px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Existing Priorities</h3>
          </div>
          <div className="p-8 text-center">
            <Icon name="inbox" className="h-12 w-12 text-default-300 mx-auto mb-3" />
            <p className="text-default-500 mb-1">No custom priorities yet</p>
            <p className="text-default-400 text-sm">
              Add your first custom priority using the form above
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default CustomPrioritiesPage;
