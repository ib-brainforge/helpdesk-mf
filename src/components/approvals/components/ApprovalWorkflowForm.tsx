import { type FC, useState, useCallback } from 'react';
import { BaseButton, Icon, BaseInput, BaseSelect, BaseSelectItem, BaseTextarea } from '@brainforgeau/components';
import { Switch, Card, CardBody } from '@heroui/react';
import { ApprovalMode, type ApprovalWorkflowStepDto } from '@/types/approval';
import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useUsersData } from '@/components/users/hooks/useUsersData';

// REVIEW: Controlled form component following existing patterns

interface ApprovalWorkflowFormProps {
  initialData?: {
    name: string;
    description?: string;
    categoryId?: string;
    approvalMode: ApprovalMode;
    isActive: boolean;
    triggerOnCreation: boolean;
    steps: ApprovalWorkflowStepDto[];
  };
  onSubmit: (data: {
    name: string;
    description?: string;
    categoryId?: string;
    approvalMode: ApprovalMode;
    isActive: boolean;
    triggerOnCreation: boolean;
    steps: ApprovalWorkflowStepDto[];
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ApprovalWorkflowForm: FC<ApprovalWorkflowFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(
    initialData?.approvalMode ?? ApprovalMode.Sequential
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [triggerOnCreation, setTriggerOnCreation] = useState(
    initialData?.triggerOnCreation ?? false
  );
  const [steps, setSteps] = useState<ApprovalWorkflowStepDto[]>(
    initialData?.steps || []
  );

  const { categories } = useCategoriesData();
  const { items: users } = useUsersData();

  const handleAddStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      {
        stepOrder: prev.length,
        name: '',
        approverUserId: undefined,
        isRequired: true,
        timeoutHours: undefined,
        escalateToUserId: undefined,
      },
    ]);
  }, []);

  const handleRemoveStep = useCallback((index: number) => {
    setSteps((prev) => {
      const newSteps = prev.filter((_, i) => i !== index);
      // Reorder steps
      return newSteps.map((step, i) => ({ ...step, stepOrder: i }));
    });
  }, []);

  const handleUpdateStep = useCallback(
    (index: number, updates: Partial<ApprovalWorkflowStepDto>) => {
      setSteps((prev) =>
        prev.map((step, i) => (i === index ? { ...step, ...updates } : step))
      );
    },
    []
  );

  const handleMoveStepUp = useCallback((index: number) => {
    if (index === 0) return;
    setSteps((prev) => {
      const newSteps = [...prev];
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      return newSteps.map((step, i) => ({ ...step, stepOrder: i }));
    });
  }, []);

  const handleMoveStepDown = useCallback((index: number) => {
    setSteps((prev) => {
      if (index === prev.length - 1) return prev;
      const newSteps = [...prev];
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
      return newSteps.map((step, i) => ({ ...step, stepOrder: i }));
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({
        name,
        description: description || undefined,
        categoryId: categoryId || undefined,
        approvalMode,
        isActive,
        triggerOnCreation,
        steps,
      });
    },
    [name, description, categoryId, approvalMode, isActive, triggerOnCreation, steps, onSubmit]
  );

  const categoryOptions = [
    { label: 'Global (All Categories)', value: '' },
    ...categories.map((cat) => ({ label: cat.name, value: cat.id })),
  ];

  const approvalModeOptions = [
    { label: 'Sequential', value: ApprovalMode.Sequential.toString() },
    { label: 'Parallel', value: ApprovalMode.Parallel.toString() },
    { label: 'Any One', value: ApprovalMode.AnyOne.toString() },
  ];

  const userOptions = users.map((user: any) => ({
    label: user.name || user.email || 'Unknown',
    value: user.id,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardBody className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>

          <BaseInput
            label="Workflow Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            isRequired
            placeholder="Enter workflow name"
          />

          <BaseTextarea
            label="Description"
            value={description}
            onValueChange={(value) => setDescription(value || '')}
            placeholder="Optional description"
            minRows={3}
          />

          <BaseSelect
            label="Category"
            selectedKeys={categoryId ? [categoryId] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys as Set<string>)[0];
              setCategoryId(selected || '');
            }}
            aria-label="Category"
          >
            {[
              <BaseSelectItem key="">Global (All Categories)</BaseSelectItem>,
              ...categories.map((cat: any) => (
                <BaseSelectItem key={cat.id}>{cat.name}</BaseSelectItem>
              )),
            ]}
          </BaseSelect>

          <BaseSelect
            label="Approval Mode"
            selectedKeys={[approvalMode.toString()]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys as Set<string>)[0];
              setApprovalMode(Number.parseInt(selected) as ApprovalMode);
            }}
            isRequired
            aria-label="Approval Mode"
          >
            {[
              <BaseSelectItem key={ApprovalMode.Sequential.toString()}>Sequential</BaseSelectItem>,
              <BaseSelectItem key={ApprovalMode.Parallel.toString()}>Parallel</BaseSelectItem>,
              <BaseSelectItem key={ApprovalMode.AnyOne.toString()}>Any One</BaseSelectItem>,
            ]}
          </BaseSelect>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Active</p>
              <p className="text-xs text-gray-500">Enable this workflow</p>
            </div>
            <Switch isSelected={isActive} onValueChange={setIsActive} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Trigger on Creation</p>
              <p className="text-xs text-gray-500">
                Automatically trigger when ticket is created in this category
              </p>
            </div>
            <Switch isSelected={triggerOnCreation} onValueChange={setTriggerOnCreation} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Approval Steps</h3>
            <BaseButton
              size="sm"
              variant="light"
              onPress={handleAddStep}
              icon={<Icon name="plus" className="h-3.5 w-3.5" />}
            >
              Add Step
            </BaseButton>
          </div>

          {steps.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Icon name="clipboard-document-list" className="h-12 w-12 mx-auto mb-2" />
              <p>No steps added yet. Click "Add Step" to create approval steps.</p>
            </div>
          )}

          <div className="space-y-3">
            {steps.map((step, index) => (
              <Card key={index} shadow="sm">
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Step {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <BaseButton
                        size="sm"
                        variant="light"
                        onPress={() => handleMoveStepUp(index)}
                        isDisabled={index === 0}
                        icon={<Icon name="chevron-up" className="h-3.5 w-3.5" />}
                      />
                      <BaseButton
                        size="sm"
                        variant="light"
                        onPress={() => handleMoveStepDown(index)}
                        isDisabled={index === steps.length - 1}
                        icon={<Icon name="chevron-down" className="h-3.5 w-3.5" />}
                      />
                      <BaseButton
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleRemoveStep(index)}
                        icon={<Icon name="trash" className="h-3.5 w-3.5" />}
                      />
                    </div>
                  </div>

                  <BaseInput
                    label="Step Name"
                    value={step.name}
                    onChange={(e) => handleUpdateStep(index, { name: e.target.value })}
                    isRequired
                    placeholder="e.g., Manager Approval"
                    size="sm"
                  />

                  <BaseSelect
                    label="Approver"
                    selectedKeys={step.approverUserId ? [step.approverUserId] : []}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys as Set<string>)[0];
                      handleUpdateStep(index, {
                        approverUserId: selected || undefined,
                      });
                    }}
                    size="sm"
                    aria-label="Approver"
                  >
                    {[
                      <BaseSelectItem key="">Select approver...</BaseSelectItem>,
                      ...userOptions.map((opt) => (
                        <BaseSelectItem key={opt.value}>{opt.label}</BaseSelectItem>
                      )),
                    ]}
                  </BaseSelect>

                  <div className="grid grid-cols-2 gap-3">
                    <BaseInput
                      label="Timeout (hours)"
                      type="number"
                      value={step.timeoutHours?.toString() || ''}
                      onChange={(e) =>
                        handleUpdateStep(index, {
                          timeoutHours: e.target.value ? Number.parseInt(e.target.value) : undefined,
                        })
                      }
                      placeholder="Optional"
                      size="sm"
                    />

                    <BaseSelect
                      label="Escalate To"
                      selectedKeys={step.escalateToUserId ? [step.escalateToUserId] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys as Set<string>)[0];
                        handleUpdateStep(index, {
                          escalateToUserId: selected || undefined,
                        });
                      }}
                      size="sm"
                      aria-label="Escalate To"
                    >
                      {[
                        <BaseSelectItem key="">No escalation</BaseSelectItem>,
                        ...userOptions.map((opt) => (
                          <BaseSelectItem key={opt.value}>{opt.label}</BaseSelectItem>
                        )),
                      ]}
                    </BaseSelect>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Required</p>
                      <p className="text-xs text-gray-500">
                        Step must be completed (cannot skip)
                      </p>
                    </div>
                    <Switch
                      size="sm"
                      isSelected={step.isRequired}
                      onValueChange={(checked) =>
                        handleUpdateStep(index, { isRequired: checked })
                      }
                    />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3 justify-end">
        <BaseButton variant="bordered" onPress={onCancel} isDisabled={isSubmitting}>
          Cancel
        </BaseButton>
        <BaseButton type="submit" color="primary" isLoading={isSubmitting}>
          {initialData ? 'Update Workflow' : 'Create Workflow'}
        </BaseButton>
      </div>
    </form>
  );
};
