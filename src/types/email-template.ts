// TODO: Replace with types from @brainforgeau/helpdesk-backend-client when available

export enum NotificationType {
  TicketCreated = 0,
  CommentAdded = 1,
  TicketAssigned = 2,
  StatusChanged = 3,
  TicketClosed = 4,
  TicketReopened = 5,
  SlaWarning = 6,
  SlaBreach = 7,
  InternalNote = 8,
  TicketMerged = 9,
  WeeklyDigest = 10,
}

export interface EmailTemplateDto {
  id: string;
  name: string;
  notificationType: NotificationType;
  subject: string;
  body: string;
  isActive: boolean;
}

export interface CreateEmailTemplateDto {
  name: string;
  notificationType: NotificationType;
  subject: string;
  body: string;
  isActive: boolean;
}

export interface UpdateEmailTemplateDto {
  name?: string;
  notificationType?: NotificationType;
  subject?: string;
  body?: string;
  isActive?: boolean;
}

export interface PreviewEmailTemplateDto {
  subject: string;
  body: string;
}

// Template variable categories for the variable picker
export interface TemplateVariableCategory {
  name: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  placeholder: string;
  description: string;
}

// Pre-defined template variables
export const TEMPLATE_VARIABLES: TemplateVariableCategory[] = [
  {
    name: 'Ticket',
    variables: [
      { name: 'ID', placeholder: '{{ticket.id}}', description: 'Ticket unique identifier' },
      { name: 'Subject', placeholder: '{{ticket.subject}}', description: 'Ticket subject' },
      { name: 'Description', placeholder: '{{ticket.description}}', description: 'Ticket description' },
      { name: 'Status', placeholder: '{{ticket.status}}', description: 'Current ticket status' },
      { name: 'Priority', placeholder: '{{ticket.priority}}', description: 'Ticket priority level' },
      { name: 'Category', placeholder: '{{ticket.category}}', description: 'Ticket category name' },
      { name: 'Created At', placeholder: '{{ticket.createdAt}}', description: 'Ticket creation timestamp' },
      { name: 'Updated At', placeholder: '{{ticket.updatedAt}}', description: 'Last update timestamp' },
      { name: 'Due Date', placeholder: '{{ticket.dueDate}}', description: 'Ticket due date' },
    ],
  },
  {
    name: 'User',
    variables: [
      { name: 'Requester Name', placeholder: '{{user.requesterName}}', description: 'Name of the ticket requester' },
      { name: 'Requester Email', placeholder: '{{user.requesterEmail}}', description: 'Email of the ticket requester' },
      { name: 'Assignee Name', placeholder: '{{user.assigneeName}}', description: 'Name of assigned agent' },
      { name: 'Assignee Email', placeholder: '{{user.assigneeEmail}}', description: 'Email of assigned agent' },
    ],
  },
  {
    name: 'Comment',
    variables: [
      { name: 'Comment Body', placeholder: '{{comment.body}}', description: 'Comment text content' },
      { name: 'Comment Author', placeholder: '{{comment.authorName}}', description: 'Name of comment author' },
      { name: 'Comment Created', placeholder: '{{comment.createdAt}}', description: 'Comment creation timestamp' },
      { name: 'Is Internal', placeholder: '{{comment.isInternal}}', description: 'Whether comment is internal note' },
    ],
  },
  {
    name: 'System',
    variables: [
      { name: 'System Name', placeholder: '{{system.name}}', description: 'Helpdesk system name' },
      { name: 'Support Email', placeholder: '{{system.supportEmail}}', description: 'System support email address' },
      { name: 'Ticket URL', placeholder: '{{system.ticketUrl}}', description: 'Direct link to ticket' },
    ],
  },
];
