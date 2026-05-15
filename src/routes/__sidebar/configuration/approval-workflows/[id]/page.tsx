/**
 * Configuration approval workflow detail page —
 * /__sidebar/configuration/approval-workflows/[id]
 *
 * W1-review-fixes: Lifted form instance to page level via useEntityForm.
 * Core fields (name, description, approvalMode, isActive, triggerOnCreation)
 * are owned by useEntityForm + Zod. Approval steps are managed as a separate
 * useState array (the step editor UI is too structurally complex for a flat
 * Zod schema). The onSubmit handler merges both when calling the mutation.
 *
 * formActions is wired to the "details" DetailPage.Tab so Save/Reset appear
 * in the PageHeader.Actions slot rather than inside the form body.
 */

import {
  useApprovalWorkflow,
  useUpdateApprovalWorkflow,
} from '@/components/approvals';
import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useUsersData } from '@/components/users/hooks/useUsersData';
import { useTabSearchParam } from '@/hooks/useTabSearchParam';
import { ApprovalMode, type ApprovalWorkflowStepDto } from '@/types/approval';
import {
  BaseButton,
  BaseCard,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
  Icon,
  PageSpinner,
} from '@brainforgeau/components';
import {
  DetailPage,
  PendingCrumb,
  useDetailTabState,
  useEntityForm,
} from '@brainforgeau/components/page';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { Card, CardContent, Switch } from '@heroui/react';
import { useParams } from '@modern-js/runtime/router';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema (core fields — steps managed as local state)
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

function EditApprovalWorkflowPage() {
  const { id } = useParams<{ id: string }>();
  const { data: workflow, isLoading } = useApprovalWorkflow(id);
  const updateMutation = useUpdateApprovalWorkflow();

  const { getParam, setParam } = useTabSearchParam();
  const { activeTab, setActiveTab } = useDetailTabState({
    defaultTab: 'details',
    getParam,
    setParam,
  });

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
    values: workflow
      ? {
          name: workflow.name ?? '',
          description: workflow.description ?? '',
          approvalMode: workflow.approvalMode ?? ApprovalMode.Sequential,
          isActive: workflow.isActive ?? true,
          triggerOnCreation: workflow.triggerOnCreation ?? false,
        }
      : undefined,
    onSubmit: async (values: ApprovalWorkflowFormData) => {
      if (!id) return;
      await updateMutation.mutateAsync({
        id,
        command: {
          name: values.name,
          description: values.description || undefined,
          approvalMode: values.approvalMode,
          isActive: values.isActive,
          triggerOnCreation: values.triggerOnCreation,
          steps,
        },
      });
    },
    invalidateQueryKeys: [['approval-workflows'], ['approval-workflows', id]],
    toast: { success: 'Workflow saved', error: 'Save failed' },
  });

  // Sync steps from server when workflow loads
  useEffect(() => {
    if (workflow?.steps) {
      setSteps(workflow.steps);
    }
  }, [workflow?.steps]);

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
    label: (user.name as string) || (user.email as string) || 'Unknown',
    value: user.id as string,
  }));

  if (isLoading || !workflow) {
    return <PageSpinner title="Loading approval workflow..." />;
  }

  const f = form.form;

  return (
    <DetailPage
      title={workflow.name || 'Approval Workflow'}
      breadcrumbsKey="configuration.approval-workflows.detail"
      breadcrumbsParams={{
        id: id!,
        name: workflow.name ?? PendingCrumb,
      }}
      documentTitle={
        workflow.name ? `Approval Workflow: ${workflow.name}` : undefined
      }
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <DetailPage.Tab
        id="details"
        title="Details"
        formActions={form.formActions}
      >
        <div className="max-w-2xl space-y-6">
          {/* Basic Information */}
          <BaseCard>
            <h2 className="text-base font-semibold">Basic Information</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    errorMessage={field.state.meta.errors
                      .map(String)
                      .join(', ')}
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
                    errorMessage={field.state.meta.errors
                      .map(String)
                      .join(', ')}
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
                      <span className="text-sm font-medium">
                        Trigger on Creation
                      </span>
                    </Switch>
                    <p className="text-muted-foreground text-xs">
                      Automatically trigger when ticket is created
                    </p>
                  </div>
                )}
              </f.Field>
            </div>
          </BaseCard>

          {/* Approval Steps — managed as local state outside useEntityForm */}
          <BaseCard>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Approval Steps</h2>
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
                <Icon
                  name="clipboard-document-list"
                  className="mb-2 h-10 w-10"
                />
                <p className="text-sm">
                  No steps added yet. Click "Add Step" to create approval steps.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {steps.map((step, index) => (
                <BaseCard key={index}>
                  <div className="flex flex-col gap-3 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Step {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <BaseButton
                          size="sm"
                          variant="light"
                          onPress={() => handleMoveStepUp(index)}
                          isDisabled={index === 0}
                          icon={
                            <Icon name="chevron-up" className="h-3.5 w-3.5" />
                          }
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
                      onValueChange={(v) =>
                        handleUpdateStep(index, { name: v })
                      }
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

                    <div className="grid grid-cols-2 gap-3">
                      <BaseInput
                        label="Timeout (hours)"
                        type="number"
                        value={step.timeoutHours?.toString() ?? ''}
                        onValueChange={(v) =>
                          handleUpdateStep(index, {
                            timeoutHours: v ? Number.parseInt(v) : undefined,
                          })
                        }
                        placeholder="Optional"
                        size="sm"
                      />

                      <BaseSelect
                        label="Escalate To"
                        selectedKey={step.escalateToUserId ?? '__none__'}
                        onSelectionChange={(key) => {
                          handleUpdateStep(index, {
                            escalateToUserId:
                              key === '__none__' ? undefined : (key as string),
                          });
                        }}
                        size="sm"
                        aria-label="Escalate To"
                      >
                        {[
                          <BaseSelectItem key="__none__" id="__none__">
                            No escalation
                          </BaseSelectItem>,
                          ...userOptions.map((opt) => (
                            <BaseSelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </BaseSelectItem>
                          )),
                        ]}
                      </BaseSelect>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Required</p>
                        <p className="text-muted-foreground text-xs">
                          Step must be completed (cannot skip)
                        </p>
                      </div>
                      <Switch
                        size="sm"
                        isSelected={step.isRequired}
                        onChange={(checked) =>
                          handleUpdateStep(index, { isRequired: checked })
                        }
                      />
                    </div>
                  </div>
                </BaseCard>
              ))}
            </div>
          </BaseCard>
        </div>
      </DetailPage.Tab>
    </DetailPage>
  );
}

export default withAuthorizationRequired(EditApprovalWorkflowPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
