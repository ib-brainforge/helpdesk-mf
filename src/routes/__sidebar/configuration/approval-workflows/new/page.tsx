/**
 * New approval workflow page — /__sidebar/configuration/approval-workflows/new
 *
 * W1-P8: Migrated to <FormPage> with useEntityForm for the core workflow fields.
 *
 * REVIEW: The approval step editor (add/remove/reorder steps) requires complex
 * stateful UI that is not representable as a Zod schema field. Steps are managed
 * as a separate useState array and passed to the mutation outside useEntityForm.
 * A future PR should extract a StepEditor compound component and evaluate
 * whether steps can be lifted into the schema as z.array(stepSchema).
 */

import { useCreateApprovalWorkflow } from '@/components/approvals';
import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useUsersData } from '@/components/users/hooks/useUsersData';
import { ApprovalMode, type ApprovalWorkflowStepDto } from '@/types/approval';
import {
  BaseButton,
  BaseCard,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
  Icon,
} from '@brainforgeau/components';
import { FormPage, useEntityForm } from '@brainforgeau/components/page';
import { Card, CardContent, Switch } from '@heroui/react';
import { useNavigate } from '@modern-js/runtime/router';
import { useCallback, useState } from 'react';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema (core fields only — steps are managed as local state)
// ---------------------------------------------------------------------------

const approvalWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string(),
  approvalMode: z.nativeEnum(ApprovalMode),
  isActive: z.boolean(),
  triggerOnCreation: z.boolean(),
});

type ApprovalWorkflowFormData = z.infer<typeof approvalWorkflowSchema>;

const APPROVAL_MODE_OPTIONS = [
  { value: ApprovalMode.Sequential, label: 'Sequential' },
  { value: ApprovalMode.Parallel, label: 'Parallel' },
  { value: ApprovalMode.AnyOne, label: 'Any One' },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function NewApprovalWorkflowPage() {
  const navigate = useNavigate();
  const createMutation = useCreateApprovalWorkflow();

  // Step management lives outside useEntityForm (too complex for Zod schema)
  const [steps, setSteps] = useState<ApprovalWorkflowStepDto[]>([]);
  const { categories } = useCategoriesData();
  const { items: users } = useUsersData();

  const form = useEntityForm<typeof approvalWorkflowSchema>({
    schema: approvalWorkflowSchema,
    defaultValues: {
      name: '',
      description: '',
      approvalMode: ApprovalMode.Sequential,
      isActive: true,
      triggerOnCreation: false,
    },
    onSubmit: async (values: ApprovalWorkflowFormData) => {
      await createMutation.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        approvalMode: values.approvalMode,
        isActive: values.isActive,
        triggerOnCreation: values.triggerOnCreation,
        steps,
      });
      navigate('/configuration/approval-workflows');
    },
    invalidateQueryKeys: [['approval-workflows']],
    toast: {
      success: 'Approval workflow created',
      error: 'Create failed',
    },
  });

  // Step helpers
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
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, stepOrder: i }))
    );
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
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((step, i) => ({ ...step, stepOrder: i }));
    });
  }, []);

  const handleMoveStepDown = useCallback((index: number) => {
    setSteps((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((step, i) => ({ ...step, stepOrder: i }));
    });
  }, []);

  const userOptions = users.map((user: any) => ({
    label: user.name || user.email || 'Unknown',
    value: user.id,
  }));

  const f = form.form;

  return (
    <FormPage
      title="Create Approval Workflow"
      breadcrumbsKey="configuration.approval-workflows.new"
      form={form}
      onCancel={() => navigate('/configuration/approval-workflows')}
    >
      <FormPage.Section title="Basic Information" columns={2}>
        <f.Field name="name">
          {(field) => (
            <BaseInput
              label="Workflow Name"
              isRequired
              placeholder="Enter workflow name"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            />
          )}
        </f.Field>

        <f.Field name="approvalMode">
          {(field) => (
            <BaseSelect
              label="Approval Mode"
              isRequired
              selectedKey={String(field.state.value)}
              onSelectionChange={(key) => {
                if (key)
                  field.handleChange(
                    Number.parseInt(String(key)) as ApprovalMode
                  );
              }}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            >
              {APPROVAL_MODE_OPTIONS.map((opt) => (
                <BaseSelectItem
                  key={String(opt.value)}
                  value={String(opt.value)}
                >
                  {opt.label}
                </BaseSelectItem>
              ))}
            </BaseSelect>
          )}
        </f.Field>

        <f.Field name="description">
          {(field) => (
            <BaseTextarea
              label="Description"
              placeholder="Optional description"
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              minRows={3}
              className="md:col-span-2"
            />
          )}
        </f.Field>

        <f.Field name="isActive">
          {(field) => (
            <div className="flex flex-col gap-1">
              <Switch
                isSelected={field.state.value}
                onChange={field.handleChange}
              >
                <span className="text-sm font-medium">Active</span>
              </Switch>
              <p className="text-muted-foreground text-xs">
                Enable this workflow
              </p>
            </div>
          )}
        </f.Field>

        <f.Field name="triggerOnCreation">
          {(field) => (
            <div className="flex flex-col gap-1">
              <Switch
                isSelected={field.state.value}
                onChange={field.handleChange}
              >
                <span className="text-sm font-medium">Trigger on Creation</span>
              </Switch>
              <p className="text-muted-foreground text-xs">
                Automatically trigger when ticket is created
              </p>
            </div>
          )}
        </f.Field>
      </FormPage.Section>

      {/* ------------------------------------------------------------------ */}
      {/* Approval Steps — managed as local state outside useEntityForm       */}
      {/* ------------------------------------------------------------------ */}
      <FormPage.Section title="Approval Steps">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Add the approval steps for this workflow.
            </p>
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
            <div className="text-muted-foreground flex flex-col items-center justify-center py-10 text-center">
              <Icon name="clipboard-document-list" className="mb-2 h-10 w-10" />
              <p className="text-sm">
                No steps added yet. Click "Add Step" to create approval steps.
              </p>
            </div>
          )}

          {steps.map((step, index) => (
            <BaseCard key={index}>
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Step {index + 1}</span>
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
                      icon={
                        <Icon name="chevron-down" className="h-3.5 w-3.5" />
                      }
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
                  onValueChange={(v) => handleUpdateStep(index, { name: v })}
                  isRequired
                  placeholder="e.g., Manager Approval"
                  size="sm"
                />

                <BaseSelect
                  label="Approver"
                  selectedKey={step.approverUserId ?? '__none__'}
                  onSelectionChange={(key) => {
                    handleUpdateStep(index, {
                      approverUserId:
                        key === '__none__' ? undefined : (key as string),
                    });
                  }}
                  size="sm"
                  aria-label="Approver"
                >
                  {[
                    <BaseSelectItem key="__none__" id="__none__">
                      Select approver...
                    </BaseSelectItem>,
                    ...userOptions.map((opt) => (
                      <BaseSelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </BaseSelectItem>
                    )),
                  ]}
                </BaseSelect>
              </div>
            </BaseCard>
          ))}
        </div>
      </FormPage.Section>
    </FormPage>
  );
}

export default NewApprovalWorkflowPage;
