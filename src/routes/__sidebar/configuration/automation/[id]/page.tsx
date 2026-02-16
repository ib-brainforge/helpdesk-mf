import { useState, useEffect } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { useParams, useNavigate } from '@modern-js/runtime/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BaseButton, BaseInput, BaseSelect, BaseSelectItem, Icon } from '@brainforgeau/components';
import { Alert, addToast, Switch, Card, CardBody, CardHeader } from '@heroui/react';
import { Textarea } from '@heroui/react';
import { AutomationRulesApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { ConditionField } from '@/components/automation/components/ConditionField';
import { ActionField } from '@/components/automation/components/ActionField';
import { AutomationRightPanel } from '@/components/automation/components/AutomationRightPanel';
import { TRIGGER_TYPE_LABELS } from '@/components/automation';
import {
  AutomationTriggerType,
  ConditionMatchType,
  ConditionType,
  ActionType,
  type AutomationRuleDto,
  type AutomationConditionDto,
  type AutomationActionDto,
} from '@/types/automation';
import { toApiAutomationTriggerType, toApiConditionMatchType } from '@/utils/typeMappers';

const CONDITION_TYPE_LABELS: Record<ConditionType, string> = {
  [ConditionType.StatusIs]: 'Status is',
  [ConditionType.StatusIsNot]: 'Status is not',
  [ConditionType.PriorityIs]: 'Priority is',
  [ConditionType.PriorityIsNot]: 'Priority is not',
  [ConditionType.CategoryIs]: 'Category is',
  [ConditionType.CategoryIsNot]: 'Category is not',
  [ConditionType.AssigneeIs]: 'Assignee is',
  [ConditionType.AssigneeIsNot]: 'Assignee is not',
  [ConditionType.RequesterIs]: 'Requester is',
  [ConditionType.RequesterIsNot]: 'Requester is not',
  [ConditionType.SubjectContains]: 'Subject contains',
  [ConditionType.SubjectNotContains]: 'Subject does not contain',
  [ConditionType.DescriptionContains]: 'Description contains',
  [ConditionType.DescriptionNotContains]: 'Description does not contain',
  [ConditionType.TagsContain]: 'Tags contain',
  [ConditionType.TagsNotContain]: 'Tags do not contain',
  [ConditionType.CreatedBefore]: 'Created before',
  [ConditionType.CreatedAfter]: 'Created after',
  [ConditionType.UpdatedBefore]: 'Updated before',
  [ConditionType.UpdatedAfter]: 'Updated after',
  [ConditionType.DueDateBefore]: 'Due date before',
  [ConditionType.DueDateAfter]: 'Due date after',
  [ConditionType.CustomFieldEquals]: 'Custom field equals',
  [ConditionType.CustomFieldNotEquals]: 'Custom field does not equal',
  [ConditionType.CustomFieldContains]: 'Custom field contains',
  [ConditionType.CustomFieldNotContains]: 'Custom field does not contain',
  [ConditionType.HasAttachments]: 'Has attachments',
};

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  [ActionType.SetStatus]: 'Set status',
  [ActionType.SetPriority]: 'Set priority',
  [ActionType.SetCategory]: 'Set category',
  [ActionType.AssignToAgent]: 'Assign to agent',
  [ActionType.AssignToGroup]: 'Assign to group',
  [ActionType.AddTag]: 'Add tag',
  [ActionType.RemoveTag]: 'Remove tag',
  [ActionType.SendEmail]: 'Send email',
  [ActionType.SendWebhook]: 'Send webhook',
  [ActionType.AddComment]: 'Add comment',
  [ActionType.AddInternalNote]: 'Add internal note',
  [ActionType.SetCustomField]: 'Set custom field',
  [ActionType.SetDueDate]: 'Set due date',
  [ActionType.AddSubscriber]: 'Add subscriber',
  [ActionType.RemoveSubscriber]: 'Remove subscriber',
  [ActionType.CloseTicket]: 'Close ticket',
  [ActionType.ReopenTicket]: 'Reopen ticket',
  [ActionType.MergeTicket]: 'Merge ticket',
  [ActionType.SplitTicket]: 'Split ticket',
  [ActionType.SendSms]: 'Send SMS',
  [ActionType.CreateTask]: 'Create task',
  [ActionType.AssignToMe]: 'Assign to me',
  [ActionType.NotifyAssignee]: 'Notify assignee',
  [ActionType.NotifyRequester]: 'Notify requester',
  [ActionType.NotifySubscribers]: 'Notify subscribers',
};

function EditAutomationRulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>(AutomationTriggerType.TicketCreated);
  const [conditionMatchType, setConditionMatchType] = useState<ConditionMatchType>(ConditionMatchType.All);
  const [conditions, setConditions] = useState<AutomationConditionDto[]>([]);
  const [actions, setActions] = useState<AutomationActionDto[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);

  const { data: rule, isLoading } = useQuery<AutomationRuleDto>({
    queryKey: ['automation-rule', id],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(AutomationRulesApi);
      const { data } = await client.v1AutomationRulesIdGet(id!);
      return data as unknown as AutomationRuleDto;
    },
    enabled: !!id,
  });

  // Load rule data into form
  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setDescription(rule.description ?? '');
      setTriggerType(rule.triggerType);
      setConditionMatchType(rule.matchType);
      setConditions(rule.conditions);
      setActions(rule.actions);
      setIsEnabled(rule.isEnabled);
    }
  }, [rule]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const client = await createHelpdeskApiClient(AutomationRulesApi);
      await client.v1AutomationRulesIdPut(id!, {
        name,
        description,
        triggerType: toApiAutomationTriggerType(triggerType),
        matchType: toApiConditionMatchType(conditionMatchType),
        conditions,
        actions,
        elseActions: [],
      });
    },
    onSuccess: () => {
      addToast({ title: 'Automation rule updated successfully', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      queryClient.invalidateQueries({ queryKey: ['automation-rule', id] });
      navigate('/configuration/automation');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to update automation rule';
      setErrors([errorMessage]);
    },
  });

  const handleSubmit = async () => {
    setErrors([]);
    setIsSubmitting(true);

    try {
      await updateMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: `temp-${Date.now()}`,
        type: ConditionType.StatusIs,
        parameters: {},
      },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<AutomationConditionDto>) => {
    setConditions(conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        id: `temp-${Date.now()}`,
        type: ActionType.SetStatus,
        sortOrder: actions.length + 1,
        parameters: {},
      },
    ]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index).map((a, i) => ({ ...a, sortOrder: i + 1 })));
  };

  const updateAction = (index: number, updates: Partial<AutomationActionDto>) => {
    setActions(actions.map((a, i) => (i === index ? { ...a, ...updates } : a)));
  };

  const moveActionUp = (index: number) => {
    if (index > 0) {
      const newActions = [...actions];
      [newActions[index - 1], newActions[index]] = [newActions[index], newActions[index - 1]];
      setActions(newActions.map((a, i) => ({ ...a, sortOrder: i + 1 })));
    }
  };

  const moveActionDown = (index: number) => {
    if (index < actions.length - 1) {
      const newActions = [...actions];
      [newActions[index], newActions[index + 1]] = [newActions[index + 1], newActions[index]];
      setActions(newActions.map((a, i) => ({ ...a, sortOrder: i + 1 })));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading rule...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Automation Rule - Configuration</title>
      </Helmet>

      <div className="mb-5">
        <div className="mb-5 items-start gap-5 lg:flex">
          <h1 className="text-gray mb-2 text-2xl font-semibold md:mb-0 dark:text-white">
            Edit Automation Rule
          </h1>
          <div className="flex shrink-0 justify-end gap-2.5 md:ml-auto">
            <BaseButton variant="light" onPress={() => navigate('/configuration/automation')}>
              Cancel
            </BaseButton>
            <BaseButton color="primary" isLoading={isSubmitting} onPress={handleSubmit}>
              Save Changes
            </BaseButton>
          </div>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main editor (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {errors.length > 0 && (
            <Alert className="mb-4" color="danger" variant="flat">
              <div className="flex flex-col gap-1">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </Alert>
          )}

          {/* Basic Info */}
          <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Basic Information</h3>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <BaseInput
              label="Rule Name"
              isRequired
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto-assign High Priority Tickets"
            />

            <Textarea
              label="Description"
              value={description}
              onValueChange={setDescription}
              placeholder="Describe what this rule does"
              minRows={2}
            />

            <BaseSelect
              label="Trigger Type"
              isRequired
              selectedKeys={[String(triggerType)]}
              onSelectionChange={(keys) => setTriggerType(Number(keys.currentKey) as AutomationTriggerType)}
            >
              {Object.entries(TRIGGER_TYPE_LABELS).map(([key, label]) => (
                <BaseSelectItem key={key}>{label}</BaseSelectItem>
              ))}
            </BaseSelect>

            <Switch isSelected={isEnabled} onValueChange={setIsEnabled}>
              Rule is Enabled
            </Switch>
          </CardBody>
        </Card>

        {/* Conditions */}
        <Card>
          <CardHeader>
            <div className="flex w-full items-center justify-between">
              <h3 className="text-lg font-semibold">Conditions</h3>
              <BaseButton size="sm" onPress={addCondition} icon={<Icon name="plus" className="h-3.5 w-3.5" />}>
                Add Condition
              </BaseButton>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <BaseSelect
              label="Match Type"
              selectedKeys={[String(conditionMatchType)]}
              onSelectionChange={(keys) => setConditionMatchType(Number(keys.currentKey) as ConditionMatchType)}
            >
              <BaseSelectItem key={String(ConditionMatchType.All)}>Match ALL conditions</BaseSelectItem>
              <BaseSelectItem key={String(ConditionMatchType.Any)}>Match ANY condition</BaseSelectItem>
              <BaseSelectItem key={String(ConditionMatchType.None)}>Match NONE of the conditions</BaseSelectItem>
            </BaseSelect>

            {conditions.length === 0 ? (
              <div className="text-sm text-gray-500">No conditions added. Click "Add Condition" to create one.</div>
            ) : (
              conditions.map((condition, index) => (
                <div key={condition.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">Condition {index + 1}</span>
                    <BaseButton
                      size="sm"
                      variant="light"
                      color="danger"
                      isIconOnly
                      onPress={() => removeCondition(index)}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </BaseButton>
                  </div>
                  <div className="flex flex-col gap-3">
                    <BaseSelect
                      label="Condition Type"
                      selectedKeys={[String(condition.type)]}
                      onSelectionChange={(keys) => updateCondition(index, { type: Number(keys.currentKey) as ConditionType, parameters: {} })}
                    >
                      {Object.entries(CONDITION_TYPE_LABELS).map(([key, label]) => (
                        <BaseSelectItem key={key}>{label}</BaseSelectItem>
                      ))}
                    </BaseSelect>
                    <ConditionField
                      type={condition.type}
                      parameters={condition.parameters}
                      onParametersChange={(params) => updateCondition(index, { parameters: params })}
                    />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <div className="flex w-full items-center justify-between">
              <h3 className="text-lg font-semibold">Actions</h3>
              <BaseButton size="sm" onPress={addAction} icon={<Icon name="plus" className="h-3.5 w-3.5" />}>
                Add Action
              </BaseButton>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            {actions.length === 0 ? (
              <div className="text-sm text-gray-500">No actions added. Click "Add Action" to create one.</div>
            ) : (
              actions.map((action, index) => (
                <div key={action.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Action {action.sortOrder}</span>
                      <div className="flex gap-1">
                        <BaseButton
                          size="sm"
                          variant="light"
                          isIconOnly
                          onPress={() => moveActionUp(index)}
                          isDisabled={index === 0}
                          title="Move Up"
                        >
                          <Icon name="chevron-up" className="h-4 w-4" />
                        </BaseButton>
                        <BaseButton
                          size="sm"
                          variant="light"
                          isIconOnly
                          onPress={() => moveActionDown(index)}
                          isDisabled={index === actions.length - 1}
                          title="Move Down"
                        >
                          <Icon name="chevron-down" className="h-4 w-4" />
                        </BaseButton>
                      </div>
                    </div>
                    <BaseButton
                      size="sm"
                      variant="light"
                      color="danger"
                      isIconOnly
                      onPress={() => removeAction(index)}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </BaseButton>
                  </div>
                  <div className="flex flex-col gap-3">
                    <BaseSelect
                      label="Action Type"
                      selectedKeys={[String(action.type)]}
                      onSelectionChange={(keys) => updateAction(index, { type: Number(keys.currentKey) as ActionType, parameters: {} })}
                    >
                      {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
                        <BaseSelectItem key={key}>{label}</BaseSelectItem>
                      ))}
                    </BaseSelect>
                    <ActionField
                      type={action.type}
                      parameters={action.parameters}
                      onParametersChange={(params) => updateAction(index, { parameters: params })}
                    />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
        </div>

        {/* Right: Helper panel (1/3 width) */}
        <div className="lg:col-span-1">
          <AutomationRightPanel />
        </div>
      </div>
    </>
  );
}

export default EditAutomationRulePage;
