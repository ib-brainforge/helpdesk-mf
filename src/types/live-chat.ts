// REVIEW: Using local types until @brainforgeau/helpdesk-client is updated with Wave 7.3 endpoints (backend PR #61).

export interface BusinessHoursDayConfig {
  open: string;   // HH:mm
  close: string;  // HH:mm
  enabled: boolean;
}

export type BusinessHoursDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type BusinessHoursJson = Partial<Record<BusinessHoursDay, BusinessHoursDayConfig>>;

export interface LiveChatWidgetConfigDto {
  id: string;
  isEnabled: boolean;
  primaryColor: string;
  greetingMessage: string;
  /** Raw JSON string or null (null means 24/7). */
  businessHoursJson: string | null;
  allowedDomains: string[];
  modifiedAt: string | null;
}

export interface UpdateLiveChatConfigRequest {
  isEnabled: boolean;
  primaryColor: string;
  greetingMessage: string;
  businessHoursJson: string | null;
  allowedDomains: string[];
}

export const DAYS_OF_WEEK: BusinessHoursDay[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

export const DEFAULT_DAY_CONFIG: BusinessHoursDayConfig = {
  open: '09:00',
  close: '17:00',
  enabled: false,
};
