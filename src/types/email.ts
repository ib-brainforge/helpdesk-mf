// Notification-backend tenant mail config types.
// These mirror the DTOs from notification-backend /v1/tenant-mail-config.
// No @brainforgeau/notification-client package exists yet — typed manually from OpenAPI.

/** Matches notification-backend OutboundMailProtocol enum */
export enum OutboundMailProtocol {
  Smtp = 0,
  SendGrid = 1,
}

/** GET /v1/tenant-mail-config response */
export interface TenantMailConfigDto {
  isConfigured: boolean;
  isEnabled: boolean;
  outboundProtocol: OutboundMailProtocol;
  outboundHost: string | null;
  outboundPort: number | null;
  username: string | null;
  /** True if an encrypted password is stored — never returns the actual password */
  hasPassword: boolean;
  useSsl: boolean;
  fromEmail: string | null;
  fromName: string | null;
}

/** PUT /v1/tenant-mail-config request body */
export interface UpsertTenantMailConfigRequest {
  isEnabled: boolean;
  outboundProtocol: OutboundMailProtocol;
  outboundHost: string | null;
  outboundPort: number | null;
  username: string | null;
  /** Plaintext — notification-backend encrypts with DataProtection before storage */
  password: string | null;
  useSsl: boolean;
  fromEmail: string | null;
  fromName: string | null;
}

/** POST /v1/tenant-mail-config/test request body */
export interface TestTenantMailConfigRequest {
  outboundHost: string;
  outboundPort: number;
  username: string | null;
  password: string | null;
  useSsl: boolean;
}

/** POST /v1/tenant-mail-config/test response */
export interface TenantMailConfigTestResult {
  success: boolean;
  error: string | null;
  latencyMs: number | null;
}
