/**
 * AutomationRuleForm — shared form for create and edit automation rule pages.
 *
 * Provides:
 * - Trigger type selector
 * - Match type selector (All / Any / None)
 * - Conditions list (conditionType + isNegated + value parameter)
 * - Actions list (actionType + per-type config)
 * - Else-actions list (same structure as actions)
 *
 * The `parameters` field on condition/action DTOs is `any` in the published client.
 * We treat it as `{ value?: string }` for single-value conditions (most common)
 * and render type-specific inputs for known action types.
 *
 * REVIEW: When the backend formalizes condition/action parameter schemas,
 * replace the generic parameter handling with typed sub-forms per type.
 */

import {
  MATCH_TYPE_LABELS,
  TRIGGER_LABELS,
} from '@/constants/automationLabels';
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
} from '@brainforgeau/components';
import {
  type HelpdeskApplicationAutomationDTOsAutomationActionDto,
  type HelpdeskApplicationAutomationDTOsAutomationConditionDto,
  HelpdeskDomainAutomationEnumsActionType,
  HelpdeskDomainAutomationEnumsAutomationTriggerType,
  HelpdeskDomainAutomationEnumsConditionMatchType,
  HelpdeskDomainAutomationEnumsConditionType,
} from '@brainforgeau/helpdesk-client';
import { addToast } from '@heroui/react';
import { useCallback } from 'react';
import { useState } from 'react';

// ─── Type helpers ─────────────────────────────────────────────────────────────

type ConditionType = HelpdeskDomainAutomationEnumsConditionType;
type ActionType = HelpdeskDomainAutomationEnumsActionType;

// Condition types that take a plain string value
const TEXT_CONDITION_TYPES: ConditionType[] = [
  HelpdeskDomainAutomationEnumsConditionType.SubjectContains,
  HelpdeskDomainAutomationEnumsConditionType.BodyContains,
  HelpdeskDomainAutomationEnumsConditionType.EmailContains,
  HelpdeskDomainAutomationEnumsConditionType.ToEmailContains,
  HelpdeskDomainAutomationEnumsConditionType.LatestResponderEmailContains,
  HelpdeskDomainAutomationEnumsConditionType.LatestCommentContains,
  HelpdeskDomainAutomationEnumsConditionType.Location,
  HelpdeskDomainAutomationEnumsConditionType.Company,
  HelpdeskDomainAutomationEnumsConditionType.Department,
];

// Condition types that take a numeric value (hours/minutes)
const NUMERIC_CONDITION_TYPES: ConditionType[] = [
  HelpdeskDomainAutomationEnumsConditionType.NotUpdated,
  HelpdeskDomainAutomationEnumsConditionType.BeforeOverdue,
];

// Condition types that need no value (boolean/presence checks)
const NO_VALUE_CONDITION_TYPES: ConditionType[] = [
  HelpdeskDomainAutomationEnumsConditionType.Overdue,
  HelpdeskDomainAutomationEnumsConditionType.TicketUnanswered,
  HelpdeskDomainAutomationEnumsConditionType.TicketUnassigned,
  HelpdeskDomainAutomationEnumsConditionType.TicketUpdatedByCustomer,
  HelpdeskDomainAutomationEnumsConditionType.TicketUpdatedByTech,
];

const CONDITION_TYPE_LABELS: Record<ConditionType, string> = {
  Status: 'Status',
  Priority: 'Priority',
  Category: 'Category',
  SubjectContains: 'Subject contains',
  BodyContains: 'Body contains',
  EmailContains: 'Email contains',
  Company: 'Company',
  Department: 'Department',
  AssignedTo: 'Assigned to',
  Tag: 'Tag',
  CustomField: 'Custom field',
  Overdue: 'Is overdue',
  BeforeOverdue: 'Before overdue (hours)',
  DueDate: 'Due date',
  NotUpdated: 'Not updated (hours)',
  TicketUnanswered: 'Ticket unanswered',
  TicketUnassigned: 'Ticket unassigned',
  TicketUpdatedByCustomer: 'Updated by customer',
  TicketUpdatedByTech: 'Updated by tech',
  ToEmailContains: 'To email contains',
  CurrentTimeBetween: 'Current time between',
  DayOfWeek: 'Day of week',
  Location: 'Location',
  LoggedBy: 'Logged by',
  LatestResponderEmailContains: 'Latest responder email contains',
  LatestCommentContains: 'Latest comment contains',
  UpdatedCustomField: 'Updated custom field',
  ApprovalState: 'Approval state',
};

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  SetStatus: 'Set status',
  Assign: 'Assign to agent',
  SetPriority: 'Set priority',
  SetCategory: 'Set category',
  AddTag: 'Add tag',
  SetDueDate: 'Set due date',
  CloseTicket: 'Close ticket',
  ReopenTicket: 'Reopen ticket',
  DeleteTicket: 'Delete ticket',
  MarkUnanswered: 'Mark unanswered',
  MarkAnswered: 'Mark answered',
  MarkSpam: 'Mark as spam',
  AddReply: 'Add reply',
  NotifyAdmins: 'Notify admins',
  NotifyTechs: 'Notify technicians',
  NotifyAssignee: 'Notify assignee',
  NotifySubmitter: 'Notify submitter',
  SendEmailToUser: 'Send email to user',
  AddSubscriber: 'Add subscriber',
  CustomField: 'Set custom field',
  AddTimeSpent: 'Add time spent',
  SetSubmitter: 'Set submitter',
  TriggerAnotherRule: 'Trigger another rule',
  HttpRequest: 'HTTP request',
  RequestApproval: 'Request approval',
};

// Action types we render a config input for; others render a note
const SUPPORTED_ACTION_TYPES: ActionType[] = [
  HelpdeskDomainAutomationEnumsActionType.SetStatus,
  HelpdeskDomainAutomationEnumsActionType.SetPriority,
  HelpdeskDomainAutomationEnumsActionType.SetCategory,
  HelpdeskDomainAutomationEnumsActionType.Assign,
  HelpdeskDomainAutomationEnumsActionType.AddTag,
  HelpdeskDomainAutomationEnumsActionType.AddReply,
  HelpdeskDomainAutomationEnumsActionType.SendEmailToUser,
  HelpdeskDomainAutomationEnumsActionType.CloseTicket,
  HelpdeskDomainAutomationEnumsActionType.ReopenTicket,
  HelpdeskDomainAutomationEnumsActionType.MarkAnswered,
  HelpdeskDomainAutomationEnumsActionType.MarkUnanswered,
  HelpdeskDomainAutomationEnumsActionType.NotifyAdmins,
  HelpdeskDomainAutomationEnumsActionType.NotifyTechs,
  HelpdeskDomainAutomationEnumsActionType.NotifyAssignee,
  HelpdeskDomainAutomationEnumsActionType.NotifySubmitter,
];

// Action types that have no config (they act standalone)
const NO_CONFIG_ACTION_TYPES: ActionType[] = [
  HelpdeskDomainAutomationEnumsActionType.CloseTicket,
  HelpdeskDomainAutomationEnumsActionType.ReopenTicket,
  HelpdeskDomainAutomationEnumsActionType.MarkAnswered,
  HelpdeskDomainAutomationEnumsActionType.MarkUnanswered,
  HelpdeskDomainAutomationEnumsActionType.NotifyAdmins,
  HelpdeskDomainAutomationEnumsActionType.NotifyTechs,
  HelpdeskDomainAutomationEnumsActionType.NotifyAssignee,
  HelpdeskDomainAutomationEnumsActionType.NotifySubmitter,
];

// ─── Local condition/action state ─────────────────────────────────────────────

interface LocalCondition {
  id: string;
  conditionType: ConditionType;
  isNegated: boolean;
  value: string; // serialised as parameters.value
}

interface LocalAction {
  id: string;
  actionType: ActionType;
  value: string; // serialised as parameters.value or parameters.body
  isElseAction: boolean;
}

function makeConditionId() {
  return `cond-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeActionId() {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function dtoToLocalCondition(
  dto: HelpdeskApplicationAutomationDTOsAutomationConditionDto,
): LocalCondition {
  const params = dto.parameters as Record<string, unknown> | null | undefined;
  return {
    id: dto.id ?? makeConditionId(),
    conditionType:
      (dto.conditionType as ConditionType) ??
      HelpdeskDomainAutomationEnumsConditionType.SubjectContains,
    isNegated: dto.isNegated ?? false,
    value:
      typeof params?.value === 'string'
        ? params.value
        : typeof params?.body === 'string'
          ? params.body
          : '',
  };
}

function dtoToLocalAction(
  dto: HelpdeskApplicationAutomationDTOsAutomationActionDto,
): LocalAction {
  const params = dto.parameters as Record<string, unknown> | null | undefined;
  return {
    id: dto.id ?? makeActionId(),
    actionType:
      (dto.actionType as ActionType) ??
      HelpdeskDomainAutomationEnumsActionType.SetStatus,
    value:
      typeof params?.value === 'string'
        ? params.value
        : typeof params?.body === 'string'
          ? params.body
          : '',
    isElseAction: dto.isElseAction ?? false,
  };
}

function localConditionToDto(
  c: LocalCondition,
): HelpdeskApplicationAutomationDTOsAutomationConditionDto {
  const needsValue =
    !NO_VALUE_CONDITION_TYPES.includes(c.conditionType) && c.value.trim();
  return {
    id: c.id.startsWith('cond-') ? undefined : c.id,
    conditionType: c.conditionType,
    isNegated: c.isNegated,
    parameters: needsValue ? { value: c.value.trim() } : undefined,
  };
}

function localActionToDto(
  a: LocalAction,
): HelpdeskApplicationAutomationDTOsAutomationActionDto {
  const needsValue =
    !NO_CONFIG_ACTION_TYPES.includes(a.actionType) && a.value.trim();
  const isTextArea =
    a.actionType === HelpdeskDomainAutomationEnumsActionType.AddReply ||
    a.actionType === HelpdeskDomainAutomationEnumsActionType.SendEmailToUser;
  return {
    id: a.id.startsWith('act-') ? undefined : a.id,
    actionType: a.actionType,
    isElseAction: a.isElseAction,
    parameters: needsValue
      ? isTextArea
        ? { body: a.value.trim() }
        : { value: a.value.trim() }
      : undefined,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: LocalCondition;
  onChange: (updated: LocalCondition) => void;
  onRemove: () => void;
}) {
  const needsValue = !NO_VALUE_CONDITION_TYPES.includes(
    condition.conditionType,
  );
  const isNumeric = NUMERIC_CONDITION_TYPES.includes(condition.conditionType);

  return (
    <div className="flex flex-wrap items-start gap-2 rounded border p-3">
      <BaseSelect
        label="Condition"
        selectedKeys={[condition.conditionType]}
        onSelectionChange={keys => {
          const val = Array.from(keys)[0] as ConditionType;
          if (val) onChange({ ...condition, conditionType: val, value: '' });
        }}
        className="min-w-[200px] flex-1"
        size="sm"
      >
        {Object.entries(CONDITION_TYPE_LABELS).map(([value, label]) => (
          <BaseSelectItem key={value}>{label}</BaseSelectItem>
        ))}
      </BaseSelect>

      {needsValue && (
        <BaseInput
          label={isNumeric ? 'Hours' : 'Value'}
          type={isNumeric ? 'number' : 'text'}
          value={condition.value}
          onValueChange={val => onChange({ ...condition, value: val })}
          placeholder={isNumeric ? 'e.g. 24' : 'Enter value'}
          className="min-w-[140px] flex-1"
          size="sm"
        />
      )}

      <BaseButton
        size="sm"
        color="danger"
        variant="light"
        onPress={onRemove}
        className="mt-5"
      >
        Remove
      </BaseButton>
    </div>
  );
}

function ActionRow({
  action,
  onChange,
  onRemove,
  label,
}: {
  action: LocalAction;
  onChange: (updated: LocalAction) => void;
  onRemove: () => void;
  label: string;
}) {
  const isSupported = SUPPORTED_ACTION_TYPES.includes(action.actionType);
  const needsConfig =
    isSupported && !NO_CONFIG_ACTION_TYPES.includes(action.actionType);
  const isTextArea =
    action.actionType === HelpdeskDomainAutomationEnumsActionType.AddReply ||
    action.actionType ===
      HelpdeskDomainAutomationEnumsActionType.SendEmailToUser;

  return (
    <div className="flex flex-col gap-2 rounded border p-3">
      <div className="flex flex-wrap items-start gap-2">
        <BaseSelect
          label={label}
          selectedKeys={[action.actionType]}
          onSelectionChange={keys => {
            const val = Array.from(keys)[0] as ActionType;
            if (val) onChange({ ...action, actionType: val, value: '' });
          }}
          className="min-w-[200px] flex-1"
          size="sm"
        >
          {Object.entries(ACTION_TYPE_LABELS).map(([value, lbl]) => (
            <BaseSelectItem key={value}>{lbl}</BaseSelectItem>
          ))}
        </BaseSelect>
        <BaseButton
          size="sm"
          color="danger"
          variant="light"
          onPress={onRemove}
          className="mt-5"
        >
          Remove
        </BaseButton>
      </div>

      {needsConfig &&
        (isTextArea ? (
          <BaseTextarea
            label="Content"
            value={action.value}
            onValueChange={val => onChange({ ...action, value: val })}
            placeholder="Enter message content"
            size="sm"
            minRows={2}
          />
        ) : (
          <BaseInput
            label="Value"
            value={action.value}
            onValueChange={val => onChange({ ...action, value: val })}
            placeholder="Enter value"
            size="sm"
          />
        ))}

      {!isSupported && (
        <p className="text-xs text-warning">
          Unsupported action type: {action.actionType} — configure via API.
        </p>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export interface AutomationRuleFormValues {
  name: string;
  description: string;
  triggerType: HelpdeskDomainAutomationEnumsAutomationTriggerType;
  matchType: HelpdeskDomainAutomationEnumsConditionMatchType;
  conditions: HelpdeskApplicationAutomationDTOsAutomationConditionDto[];
  actions: HelpdeskApplicationAutomationDTOsAutomationActionDto[];
  elseActions: HelpdeskApplicationAutomationDTOsAutomationActionDto[];
  isEnabled?: boolean;
}

interface AutomationRuleFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<AutomationRuleFormValues>;
  onSave: (values: AutomationRuleFormValues) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function AutomationRuleForm({
  mode,
  initialValues,
  onSave,
  onCancel,
  isSaving,
}: AutomationRuleFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(
    initialValues?.description ?? '',
  );
  const [triggerType, setTriggerType] =
    useState<HelpdeskDomainAutomationEnumsAutomationTriggerType>(
      initialValues?.triggerType ??
        HelpdeskDomainAutomationEnumsAutomationTriggerType.TicketCreated,
    );
  const [matchType, setMatchType] =
    useState<HelpdeskDomainAutomationEnumsConditionMatchType>(
      initialValues?.matchType ??
        HelpdeskDomainAutomationEnumsConditionMatchType.All,
    );
  const [isEnabled, setIsEnabled] = useState(initialValues?.isEnabled ?? true);

  const [conditions, setConditions] = useState<LocalCondition[]>(() =>
    (initialValues?.conditions ?? []).map(dtoToLocalCondition),
  );
  const [actions, setActions] = useState<LocalAction[]>(() =>
    (initialValues?.actions ?? []).map(dtoToLocalAction),
  );
  const [elseActions, setElseActions] = useState<LocalAction[]>(() =>
    (initialValues?.elseActions ?? []).map(dtoToLocalAction),
  );

  const addCondition = useCallback(() => {
    setConditions(prev => [
      ...prev,
      {
        id: makeConditionId(),
        conditionType:
          HelpdeskDomainAutomationEnumsConditionType.SubjectContains,
        isNegated: false,
        value: '',
      },
    ]);
  }, []);

  const addAction = useCallback(() => {
    setActions(prev => [
      ...prev,
      {
        id: makeActionId(),
        actionType: HelpdeskDomainAutomationEnumsActionType.SetStatus,
        value: '',
        isElseAction: false,
      },
    ]);
  }, []);

  const addElseAction = useCallback(() => {
    setElseActions(prev => [
      ...prev,
      {
        id: makeActionId(),
        actionType: HelpdeskDomainAutomationEnumsActionType.SetStatus,
        value: '',
        isElseAction: true,
      },
    ]);
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    if (actions.length === 0) {
      addToast({
        title: 'At least one action is required',
        severity: 'danger',
      });
      return;
    }
    onSave({
      name: name.trim(),
      description,
      triggerType,
      matchType,
      isEnabled,
      conditions: conditions.map(localConditionToDto),
      actions: actions.map(localActionToDto),
      elseActions: elseActions.map(a =>
        localActionToDto({ ...a, isElseAction: true }),
      ),
    });
  }, [
    name,
    description,
    triggerType,
    matchType,
    isEnabled,
    conditions,
    actions,
    elseActions,
    onSave,
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Basic info */}
      <section className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-default-600">Basic Info</h2>
        <BaseInput
          label="Name"
          value={name}
          onValueChange={setName}
          placeholder="e.g. Auto-assign on create"
          isRequired
        />
        <BaseInput
          label="Description"
          value={description}
          onValueChange={setDescription}
          placeholder="Optional description"
        />

        <div className="flex flex-wrap gap-3">
          <BaseSelect
            label="Trigger"
            selectedKeys={[triggerType]}
            onSelectionChange={keys => {
              const val = Array.from(
                keys,
              )[0] as HelpdeskDomainAutomationEnumsAutomationTriggerType;
              if (val) setTriggerType(val);
            }}
            className="flex-1"
          >
            {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
              <BaseSelectItem key={value}>{label}</BaseSelectItem>
            ))}
          </BaseSelect>

          <BaseSelect
            label="Match type"
            selectedKeys={[matchType]}
            onSelectionChange={keys => {
              const val = Array.from(
                keys,
              )[0] as HelpdeskDomainAutomationEnumsConditionMatchType;
              if (val) setMatchType(val);
            }}
            className="flex-1"
          >
            {Object.entries(MATCH_TYPE_LABELS).map(([value, label]) => (
              <BaseSelectItem key={value}>{label}</BaseSelectItem>
            ))}
          </BaseSelect>
        </div>

        {/* isEnabled only on create (Update command doesn't carry this field) */}
        {mode === 'create' && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isEnabled"
              checked={isEnabled}
              onChange={e => setIsEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="isEnabled" className="text-sm">
              Enable rule immediately
            </label>
          </div>
        )}
      </section>

      {/* Conditions */}
      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-default-600">Conditions</h2>
          <BaseButton size="sm" variant="bordered" onPress={addCondition}>
            Add condition
          </BaseButton>
        </div>
        {conditions.length === 0 ? (
          <p className="text-sm text-default-400">
            No conditions — rule triggers on every matching event.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {conditions.map((cond, i) => (
              <ConditionRow
                key={cond.id}
                condition={cond}
                onChange={updated =>
                  setConditions(prev =>
                    prev.map((c, idx) => (idx === i ? updated : c)),
                  )
                }
                onRemove={() =>
                  setConditions(prev => prev.filter((_, idx) => idx !== i))
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Actions */}
      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-default-600">Actions</h2>
          <BaseButton size="sm" variant="bordered" onPress={addAction}>
            Add action
          </BaseButton>
        </div>
        {actions.length === 0 ? (
          <p className="text-sm text-danger-400">
            At least one action is required.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {actions.map((action, i) => (
              <ActionRow
                key={action.id}
                action={action}
                label="Action type"
                onChange={updated =>
                  setActions(prev =>
                    prev.map((a, idx) => (idx === i ? updated : a)),
                  )
                }
                onRemove={() =>
                  setActions(prev => prev.filter((_, idx) => idx !== i))
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Else actions */}
      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-default-600">
            Else Actions{' '}
            <span className="font-normal text-default-400">(optional)</span>
          </h2>
          <BaseButton size="sm" variant="bordered" onPress={addElseAction}>
            Add else action
          </BaseButton>
        </div>
        {elseActions.length === 0 ? (
          <p className="text-sm text-default-400">
            No else actions — run nothing when conditions are not met.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {elseActions.map((action, i) => (
              <ActionRow
                key={action.id}
                action={action}
                label="Else action type"
                onChange={updated =>
                  setElseActions(prev =>
                    prev.map((a, idx) => (idx === i ? updated : a)),
                  )
                }
                onRemove={() =>
                  setElseActions(prev => prev.filter((_, idx) => idx !== i))
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Save / Cancel */}
      <div className="flex gap-3">
        <BaseButton
          color="primary"
          onPress={handleSave}
          isLoading={isSaving}
          isDisabled={!name.trim()}
        >
          {mode === 'create' ? 'Create' : 'Save changes'}
        </BaseButton>
        <BaseButton variant="light" onPress={onCancel}>
          Cancel
        </BaseButton>
      </div>
    </div>
  );
}
