/**
 * Typed HTTP client for notification-backend.
 *
 * No @brainforgeau/notification-client package exists yet (Stage 4 intent is to
 * build one in Wave 8). This module encapsulates all direct fetch calls so they
 * are easy to swap for a generated client later.
 *
 * Base URL: appConfig.api.notificationUrl (set in runtime config as the value
 * provided to TopNavbar — e.g. https://notification-api.example.com).
 */
import { authorizedAxios } from '@/state/authorizedAxios';
import { getAppConfig } from '@/state/config';
import type {
  TenantMailConfigDto,
  TenantMailConfigTestResult,
  TestTenantMailConfigRequest,
  UpsertTenantMailConfigRequest,
} from '@/types/email';

function getNotificationBaseUrl(): string {
  const config = getAppConfig();
  const url: string | undefined = config?.api?.notificationUrl as
    | string
    | undefined;
  if (!url) {
    throw new Error(
      'Notification API base URL (api.notificationUrl) is not configured',
    );
  }
  return url.replace(/\/$/, '');
}

export async function getTenantMailConfig(): Promise<TenantMailConfigDto> {
  const baseUrl = getNotificationBaseUrl();
  const response = await authorizedAxios.get<TenantMailConfigDto>(
    `${baseUrl}/v1/tenant-mail-config`,
  );
  return response.data;
}

export async function upsertTenantMailConfig(
  request: UpsertTenantMailConfigRequest,
): Promise<TenantMailConfigDto> {
  const baseUrl = getNotificationBaseUrl();
  const response = await authorizedAxios.put<TenantMailConfigDto>(
    `${baseUrl}/v1/tenant-mail-config`,
    request,
  );
  return response.data;
}

export async function testTenantMailConfig(
  request: TestTenantMailConfigRequest,
): Promise<TenantMailConfigTestResult> {
  const baseUrl = getNotificationBaseUrl();
  const response = await authorizedAxios.post<TenantMailConfigTestResult>(
    `${baseUrl}/v1/tenant-mail-config/test`,
    request,
  );
  return response.data;
}
