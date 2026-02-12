// TODO: Replace with types from @brainforgeau/helpdesk-backend-client when available

export enum AutomationTriggerType {
  TicketCreated = 0,
  TicketUpdated = 1,
  TicketStatusChanged = 2,
  CommentAdded = 3,
  TicketAssigned = 4,
  TicketClosed = 5,
  TicketReopened = 6,
  TicketOverdue = 7,
  TicketNotUpdated = 8,
  TicketPriorityChanged = 9,
  TicketCategoryChanged = 10,
  TicketTagAdded = 11,
  TicketTagRemoved = 12,
  TicketDueDateChanged = 13,
}

export enum ConditionMatchType {
  All = 0,
  Any = 1,
  None = 2,
}

export enum ConditionType {
  StatusIs = 0,
  StatusIsNot = 1,
  PriorityIs = 2,
  PriorityIsNot = 3,
  CategoryIs = 4,
  CategoryIsNot = 5,
  AssigneeIs = 6,
  AssigneeIsNot = 7,
  RequesterIs = 8,
  RequesterIsNot = 9,
  SubjectContains = 10,
  SubjectNotContains = 11,
  DescriptionContains = 12,
  DescriptionNotContains = 13,
  TagsContain = 14,
  TagsNotContain = 15,
  CreatedBefore = 16,
  CreatedAfter = 17,
  UpdatedBefore = 18,
  UpdatedAfter = 19,
  DueDateBefore = 20,
  DueDateAfter = 21,
  CustomFieldEquals = 22,
  CustomFieldNotEquals = 23,
  CustomFieldContains = 24,
  CustomFieldNotContains = 25,
  HasAttachments = 26,
}

export enum ActionType {
  SetStatus = 0,
  SetPriority = 1,
  SetCategory = 2,
  AssignToAgent = 3,
  AssignToGroup = 4,
  AddTag = 5,
  RemoveTag = 6,
  SendEmail = 7,
  SendWebhook = 8,
  AddComment = 9,
  AddInternalNote = 10,
  SetCustomField = 11,
  SetDueDate = 12,
  AddSubscriber = 13,
  RemoveSubscriber = 14,
  CloseTicket = 15,
  ReopenTicket = 16,
  MergeTicket = 17,
  SplitTicket = 18,
  SendSms = 19,
  CreateTask = 20,
  AssignToMe = 21,
  NotifyAssignee = 22,
  NotifyRequester = 23,
  NotifySubscribers = 24,
}

export interface AutomationConditionDto {
  id: string;
  type: ConditionType;
  parameters: Record<string, any>;
}

export interface AutomationActionDto {
  id: string;
  type: ActionType;
  sortOrder: number;
  parameters: Record<string, any>;
}

export interface AutomationRuleListDto {
  id: string;
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  conditionCount: number;
  actionCount: number;
  isEnabled: boolean;
  sortOrder: number;
  lastExecutedAt?: string;
  executionCount: number;
}

export interface AutomationRuleDto {
  id: string;
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  conditionMatchType: ConditionMatchType;
  conditions: AutomationConditionDto[];
  actions: AutomationActionDto[];
  isEnabled: boolean;
  sortOrder: number;
  lastExecutedAt?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationRuleDto {
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  conditionMatchType: ConditionMatchType;
  conditions: Omit<AutomationConditionDto, 'id'>[];
  actions: Omit<AutomationActionDto, 'id'>[];
  isEnabled: boolean;
}

export interface UpdateAutomationRuleDto {
  name?: string;
  description?: string;
  triggerType?: AutomationTriggerType;
  conditionMatchType?: ConditionMatchType;
  conditions?: Omit<AutomationConditionDto, 'id'>[];
  actions?: Omit<AutomationActionDto, 'id'>[];
  isEnabled?: boolean;
}

export interface ReorderAutomationRulesDto {
  ruleIds: string[];
}
