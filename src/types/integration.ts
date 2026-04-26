// Local DTO projections used by hooks; the IntegrationsApi is now published in helpdesk-client.
// Keeping local copies to keep the hook layer decoupled from the generated long type names.

export enum IntegrationType {
  Slack = 1,
  Jira = 2,
  GitHub = 3,
  Zapier = 4,
}

export interface IntegrationConfigDto {
  id: string;
  type: IntegrationType;
  typeName: string;
  name: string;
  isEnabled: boolean;
  /** Provider-specific key/value JSON bag. Informational only — routing not yet implemented. */
  configJson: string;
  createdAt: string;
  modifiedAt: string;
}

export interface AddIntegrationRequest {
  type: IntegrationType;
  name: string;
  isEnabled: boolean;
  configJson: string;
}

export interface UpdateIntegrationRequest {
  name: string;
  isEnabled: boolean;
  configJson: string;
}

// Provider metadata for the tile UI

export interface IntegrationProviderMeta {
  type: IntegrationType;
  label: string;
  description: string;
  icon: string;         // Icon name from @brainforgeau/components Icon
  configFields: IntegrationConfigField[];
}

export interface IntegrationConfigField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;     // Render as password input
  required?: boolean;
}

export const INTEGRATION_PROVIDERS: IntegrationProviderMeta[] = [
  {
    type: IntegrationType.Slack,
    label: 'Slack',
    description: 'Post ticket updates and notifications to Slack channels.',
    icon: 'chat-bubble-left-right',
    configFields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...', required: true },
      { key: 'channel', label: 'Channel (optional)', placeholder: '#helpdesk-notifications' },
    ],
  },
  {
    type: IntegrationType.Jira,
    label: 'Jira',
    description: 'Sync tickets with Jira issues bidirectionally.',
    icon: 'ticket',
    configFields: [
      { key: 'baseUrl', label: 'Jira Base URL', placeholder: 'https://yourorg.atlassian.net', required: true },
      { key: 'email', label: 'Account Email', placeholder: 'user@example.com', required: true },
      { key: 'apiToken', label: 'API Token', placeholder: '••••••••', secret: true, required: true },
      { key: 'projectKey', label: 'Project Key', placeholder: 'HELP', required: true },
    ],
  },
  {
    type: IntegrationType.GitHub,
    label: 'GitHub',
    description: 'Link tickets to GitHub issues and pull requests.',
    icon: 'code-bracket',
    configFields: [
      { key: 'owner', label: 'Owner (org or user)', placeholder: 'my-org', required: true },
      { key: 'repo', label: 'Repository', placeholder: 'my-repo', required: true },
      { key: 'token', label: 'Personal Access Token', placeholder: 'ghp_••••••••', secret: true, required: true },
    ],
  },
  {
    type: IntegrationType.Zapier,
    label: 'Zapier',
    description: 'Trigger Zapier zaps from ticket events via webhook.',
    icon: 'bolt',
    configFields: [
      { key: 'webhookUrl', label: 'Zapier Webhook URL', placeholder: 'https://hooks.zapier.com/hooks/catch/...', required: true },
    ],
  },
];
