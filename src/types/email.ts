// TODO: Replace with types from @brainforgeau/helpdesk-backend-client when available

export enum MailProtocol {
  Imap = 0,
  Pop3 = 1,
}

export interface MailServerConfigDto {
  id: string;
  name: string;
  protocol: MailProtocol;
  inboundHost: string;
  inboundPort: number;
  outboundHost: string;
  outboundPort: number;
  username: string;
  useSsl: boolean;
  isActive: boolean;
  healthStatus?: string;
  folder?: string;
}

export interface CreateMailServerConfigDto {
  name: string;
  protocol: MailProtocol;
  inboundHost: string;
  inboundPort: number;
  outboundHost: string;
  outboundPort: number;
  username: string;
  password: string;
  useSsl: boolean;
  isActive: boolean;
  folder?: string;
}

export interface UpdateMailServerConfigDto {
  name?: string;
  protocol?: MailProtocol;
  inboundHost?: string;
  inboundPort?: number;
  outboundHost?: string;
  outboundPort?: number;
  username?: string;
  password?: string;
  useSsl?: boolean;
  isActive?: boolean;
  folder?: string;
}

export interface TestMailConnectionDto {
  mailServerConfigId: string;
}

export interface TestMailConnectionResult {
  success: boolean;
  message: string;
}
