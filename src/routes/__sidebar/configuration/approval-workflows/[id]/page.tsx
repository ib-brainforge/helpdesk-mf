/**
 * Configuration approval workflow detail page —
 * /__sidebar/configuration/approval-workflows/[id]
 *
 * Tenant-scoped view/edit backed by the real generated ApprovalWorkflowsApi
 * GET-by-id / PUT / DELETE endpoints. Core fields use useEntityForm; the
 * approval step editor (add/remove/reorder/edit) is managed as local state
 * outside the Zod schema, matching the ../new page's pattern, then merged
 * into the PUT payload on save. triggerStatusId is seeded from the loaded
 * workflow and always included in the PUT (the backend full-replaces all
 * command fields), with a base-status picker shown when "Trigger on Status
 * Change" is enabled.
 */

import { AppLoadingSplash } from '@/components/AppSplash';
import {
  useApprovalWorkflow,
  useDeleteApprovalWorkflow,
  useUpdateApprovalWorkflow,
} from '@/components/approvals';
import { useUsersData } from '@/components/users/hooks/useUsersData';
import { APPROVAL_MODE_LABELS } from '@/constants/approvalLabels';
import { useTabSearchParam } from '@/hooks/useTabSearchParam';
import { TicketStatus } from '@/types/custom-status';
import {
  BaseButton,
  BaseCard,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
  BaseToggle,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import {
  DetailPage,
  EmptyState,
  useConfirm,
  useDetailTabState,
  useEntityForm,
} from '@brainforgeau/components/page';
import {
  type HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdateApprovalWorkflowStepDto as ApprovalWorkflowStepFormDto,
  HelpdeskDomainApprovalsEnumsApprovalMode,
} from '@brainforgeau/helpdesk-client';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

// REVIEW: TriggerStatusId is int? on the backend with no evaluation logic
// consuming it yet. The only integer status concept in the helpdesk domain is
// the base TicketStatus enum (New=1/InProgress=2/Closed=3 — custom statuses
// are GUID-keyed), so the trigger-status picker offers those base statuses,
// mirroring the MAPS_TO_OPTIONS pattern in CustomStatusEditorModal.
const TRIGGER_STATUS_OPTIONS = [
  { value: TicketStatus.New, label: 'New' },
  { value: TicketStatus.InProgress, label: 'In Progress' },
  { value: TicketStatus.Closed, label: 'Closed' },
];

const approvalWorkflowSchema = z
  .object({
    name: z.string().min(1, 'Workflow name is required'),
    description: z.string(),
    approvalMode: z.nativeEnum(HelpdeskDomainApprovalsEnumsApprovalMode),
    isActive: z.boolean(),
    triggerOnCreation: z.boolean(),
    triggerOnStatusChange: z.boolean(),
    triggerStatusId: z.number().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.triggerOnStatusChange && data.triggerStatusId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['triggerStatusId'],
        message: 'Trigger status is required when triggering on status change',
      });
    }
  });

type ApprovalWorkflowFormData = z.infer<typeof approvalWorkflowSchema>;

function EditApprovalWorkflowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const { data: workflow, isLoading } = useApprovalWorkflow(id);
  const updateMutation = useUpdateApprovalWorkflow();
  const deleteMutation = useDeleteApprovalWorkflow();

  const { items: users } = useUsersData();

  // Step management lives outside useEntityForm (too complex for Zod schema),
  // seeded from the loaded workflow once it arrives.
  const [steps, setSteps] = useState<ApprovalWorkflowStepFormDto[]>([]);
  const [stepsInitialized, setStepsInitialized] = useState(false);

  useEffect(() => {
    if (workflow && !stepsInitialized) {
      setSteps(
        [...(workflow.steps ?? [])]
          .sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0))
          .map(step => ({
            name: step.name ?? '',
            approverUserId: step.approverUserId ?? undefined,
            approverRoleId: step.approverRoleId ?? undefined,
            isRequired: step.isRequired ?? true,
            timeoutHours: step.timeoutHours ?? undefined,
            escalateToUserId: step.escalateToUserId ?? undefined,
          })),
      );
      setStepsInitialized(true);
    }
  }, [workflow, stepsInitialized]);

  const { getParam, setParam } = useTabSearchParam();
  const { activeTab, setActiveTab } = useDetailTabState({
    defaultTab: 'details',
    getParam,
    setParam,
  });

  const detailsForm = useEntityForm<typeof approvalWorkflowSchema>({
    schema: approvalWorkflowSchema,
    defaultValues: {
      name: '',
      description: '',
      approvalMode: HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
      isActive: true,
      triggerOnCreation: false,
      triggerOnStatusChange: false,
      triggerStatusId: null,
    },
    values: workflow
      ? {
          name: workflow.name ?? '',
          description: workflow.description ?? '',
          approvalMode:
            workflow.approvalMode ??
            HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
          isActive: workflow.isActive ?? true,
          triggerOnCreation: workflow.triggerOnCreation ?? false,
          triggerOnStatusChange: workflow.triggerOnStatusChange ?? false,
          triggerStatusId: workflow.triggerStatusId ?? null,
        }
      : undefined,
    onSubmit: async (values: ApprovalWorkflowFormData) => {
      if (!id) return;
      await updateMutation.mutateAsync({
        id,
        command: {
          workflowId: id,
          name: values.name,
          description: values.description || undefined,
          approvalMode: values.approvalMode,
          isActive: values.isActive,
          triggerOnCreation: values.triggerOnCreation,
          triggerOnStatusChange: values.triggerOnStatusChange,
          // Backend full-replaces all fields from the command — always pass
          // triggerStatusId through so saves never clobber a stored value.
          triggerStatusId: values.triggerStatusId,
          steps,
        },
      });
    },
    invalidateQueryKeys: [['approval-workflows'], ['approval-workflows', id]],
    toast: { success: 'Approval workflow saved', error: 'Save failed' },
  });

  const handleAddStep = useCallback(() => {
    setSteps(prev => [
      ...prev,
      {
        name: '',
        approverUserId: undefined,
        isRequired: true,
        timeoutHours: undefined,
        escalateToUserId: undefined,
      },
    ]);
  }, []);

  const handleRemoveStep = useCallback((index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateStep = useCallback(
    (index: number, updates: Partial<ApprovalWorkflowStepFormDto>) => {
      setSteps(prev =>
        prev.map((step, i) => (i === index ? { ...step, ...updates } : step)),
      );
    },
    [],
  );

  const handleMoveStepUp = useCallback((index: number) => {
    if (index === 0) return;
    setSteps(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const handleMoveStepDown = useCallback((index: number) => {
    setSteps(prev => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Delete Approval Workflow',
      body: `Delete approval workflow "${workflow?.name ?? ''}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        navigate('/configuration/approval-workflows');
      },
    });
  }, [confirm, deleteMutation, id, navigate, workflow?.name]);

  const userOptions = users.map(user => ({
    label: user.name || user.email || 'Unknown',
    value: user.id,
  }));

  if (isLoading) {
    return <AppLoadingSplash />;
  }

  if (!workflow) {
    return (
      <EmptyState
        title="Approval workflow not found"
        description="This approval workflow may have been deleted."
        size="lg"
      />
    );
  }

  const f = detailsForm.form;

  return (
    <>
      <DetailPage
        title={workflow.name ?? 'Untitled Approval Workflow'}
        breadcrumbsKey="configuration.approval-workflows.detail"
        breadcrumbsParams={{ id: id!, name: workflow.name ?? id! }}
        documentTitle={
          workflow.name ? `Approval Workflow: ${workflow.name}` : undefined
        }
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerActions={
          <BaseButton
            variant="bordered"
            color="danger"
            size="sm"
            icon={<Icon name="trash" className="h-4 w-4" />}
            onPress={handleDelete}
            isDisabled={deleteMutation.isPending}
          >
            Delete
          </BaseButton>
        }
      >
        <DetailPage.Tab
          id="details"
          title="Details"
          formActions={detailsForm.formActions}
        >
          <div className="flex flex-col gap-6">
            <BaseCard>
              <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
                <f.Field name="name">
                  {field => (
                    <BaseInput
                      label="Workflow Name"
                      isRequired
                      placeholder="Enter workflow name"
                      value={field.state.value}
                      onChange={e => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      isInvalid={field.state.meta.errors.length > 0}
                      errorMessage={field.state.meta.errors
                        .map(String)
                        .join(', ')}
                    />
                  )}
                </f.Field>

                <f.Field name="approvalMode">
                  {field => (
                    <BaseSelect
                      label="Approval Mode"
                      isRequired
                      selectedKey={field.state.value}
                      onSelectionChange={key => {
                        if (key)
                          field.handleChange(
                            String(
                              key,
                            ) as HelpdeskDomainApprovalsEnumsApprovalMode,
                          );
                      }}
                      isInvalid={field.state.meta.errors.length > 0}
                      errorMessage={field.state.meta.errors
                        .map(String)
                        .join(', ')}
                    >
                      {Object.entries(APPROVAL_MODE_LABELS).map(
                        ([value, label]) => (
                          <BaseSelectItem key={value} value={value}>
                            {label}
                          </BaseSelectItem>
                        ),
                      )}
                    </BaseSelect>
                  )}
                </f.Field>

                <f.Field name="description">
                  {field => (
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
                  {field => (
                    <div className="flex flex-col gap-1">
                      <BaseToggle
                        isSelected={field.state.value}
                        onChange={field.handleChange}
                      >
                        <span className="text-sm font-medium">Active</span>
                      </BaseToggle>
                      <p className="text-muted-foreground text-xs">
                        Enable this workflow
                      </p>
                    </div>
                  )}
                </f.Field>

                <f.Field name="triggerOnCreation">
                  {field => (
                    <div className="flex flex-col gap-1">
                      <BaseToggle
                        isSelected={field.state.value}
                        onChange={field.handleChange}
                      >
                        <span className="text-sm font-medium">
                          Trigger on Creation
                        </span>
                      </BaseToggle>
                      <p className="text-muted-foreground text-xs">
                        Automatically trigger when ticket is created
                      </p>
                    </div>
                  )}
                </f.Field>

                <f.Field name="triggerOnStatusChange">
                  {field => (
                    <div className="flex flex-col gap-1">
                      <BaseToggle
                        isSelected={field.state.value}
                        onChange={field.handleChange}
                      >
                        <span className="text-sm font-medium">
                          Trigger on Status Change
                        </span>
                      </BaseToggle>
                      <p className="text-muted-foreground text-xs">
                        Automatically trigger when ticket status changes
                      </p>
                    </div>
                  )}
                </f.Field>

                <f.Subscribe
                  selector={(state: { values: ApprovalWorkflowFormData }) =>
                    state.values.triggerOnStatusChange
                  }
                >
                  {(triggerOnStatusChange: boolean) =>
                    triggerOnStatusChange ? (
                      <f.Field name="triggerStatusId">
                        {field => (
                          <BaseSelect
                            label="Trigger Status"
                            isRequired
                            selectedKey={
                              field.state.value != null
                                ? String(field.state.value)
                                : '__none__'
                            }
                            onSelectionChange={key => {
                              field.handleChange(
                                key === '__none__' || key == null
                                  ? null
                                  : Number(key),
                              );
                            }}
                            isInvalid={field.state.meta.errors.length > 0}
                            errorMessage={field.state.meta.errors
                              .map(String)
                              .join(', ')}
                          >
                            {[
                              <BaseSelectItem key="__none__" id="__none__">
                                Select status...
                              </BaseSelectItem>,
                              ...TRIGGER_STATUS_OPTIONS.map(opt => (
                                <BaseSelectItem
                                  key={String(opt.value)}
                                  value={String(opt.value)}
                                >
                                  {opt.label}
                                </BaseSelectItem>
                              )),
                            ]}
                          </BaseSelect>
                        )}
                      </f.Field>
                    ) : null
                  }
                </f.Subscribe>
              </div>
            </BaseCard>

            {/* ---------------------------------------------------------------- */}
            {/* Approval Steps — managed as local state, merged in on save        */}
            {/* ---------------------------------------------------------------- */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Approval Steps</h3>
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
                    No steps added yet. Click "Add Step" to create approval
                    steps.
                  </p>
                </div>
              )}

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
                      onValueChange={v => handleUpdateStep(index, { name: v })}
                      isRequired
                      placeholder="e.g., Manager Approval"
                      size="sm"
                    />

                    <BaseSelect
                      label="Approver"
                      selectedKey={step.approverUserId ?? '__none__'}
                      onSelectionChange={key => {
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
                        ...userOptions.map(opt => (
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
          </div>
        </DetailPage.Tab>
      </DetailPage>
      {dialog}
    </>
  );
}

export default withAuthorizationRequired(EditApprovalWorkflowPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
