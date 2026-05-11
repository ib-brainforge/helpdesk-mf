import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BaseButton, BaseInput, Icon } from '@brainforgeau/components';
import { EmptyState } from '@brainforgeau/components/page';
import { toast } from '@heroui/react';
import { Helmet } from '@modern-js/runtime/head';
import { useState } from 'react';

function CustomPrioritiesPage() {
  const [priorityName, setPriorityName] = useState('');

  const handleAdd = () => {
    if (!priorityName.trim()) {
      toast('Validation error', {
        description: 'Please enter a priority name',
        variant: 'warning',
      });
      return;
    }

    toast('Backend not available', {
      description: 'Custom priorities API is not yet implemented',
      variant: 'warning',
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
            {
              label: 'Custom Priorities',
              href: '/configuration/custom-priorities',
              isCurrent: true,
            },
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
            Custom priorities allow you to define specific priority levels
            beyond the default options (Critical, High, Normal, Low). Use this
            to match your organization's workflow.
          </p>
          <div className="flex items-end gap-3">
            <BaseInput
              label="Priority Name"
              placeholder="Enter priority name..."
              value={priorityName}
              onChange={e => setPriorityName(e.target.value)}
              onKeyDown={e => {
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
          <EmptyState
            title="No custom priorities yet"
            description="Add your first custom priority using the form above."
            size="sm"
          />
        </div>
      </div>
    </>
  );
}

export default CustomPrioritiesPage;
