/**
 * Live Chat configuration page, HIDDEN for now (design v3: Live Chat and
 * Integrations are not offered yet). It used to be the route
 * routes/__sidebar/configuration/live-chat/page.tsx. The code, hooks, types and
 * breadcrumb key are kept so it can come back. To restore it, recreate that
 * page.tsx as `export { default } from '@/components/...';` and uncomment
 * the nav entry in routes/layout.tsx.
 */
import {
  useGetLiveChatConfig,
  useGetLiveChatEmbedScript,
  useUpdateLiveChatConfig,
} from '@/components/live-chat/hooks/useLiveChat';
import { IconTip } from '@/components/shared';
import {
  type BusinessHoursDay,
  type BusinessHoursDayConfig,
  type BusinessHoursJson,
  DAYS_OF_WEEK,
  DEFAULT_DAY_CONFIG,
} from '@/types/live-chat';
import {
  BaseButton,
  BaseCard,
  BaseInput,
  BaseTextarea,
  BaseToggle,
  Icon,
} from '@brainforgeau/components';
import { PageBody, PageHeader } from '@brainforgeau/components/page';
import { Card, CardContent, toast } from '@heroui/react';
import { useState } from 'react';

const DAY_LABELS: Record<BusinessHoursDay, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function parseBusinessHours(
  json: string | null | undefined,
): BusinessHoursJson {
  if (!json) return {};
  try {
    return JSON.parse(json) as BusinessHoursJson;
  } catch {
    return {};
  }
}

/** Returns true when the string is a valid CSS hex colour (#rgb or #rrggbb). */
function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function serializeBusinessHours(hours: BusinessHoursJson): string | null {
  const hasAnyEnabled = Object.values(hours).some(d => d?.enabled);
  const hasAnyDay = Object.keys(hours).length > 0;
  if (!hasAnyDay || !hasAnyEnabled) return null;
  return JSON.stringify(hours);
}

// -----------------------------------------------------------------------
// Inner form — receives server config as initial values.
// Mounted with key={config.id} so it remounts when config loads, ensuring
// all useState atoms start from server values without a useEffect mirror.
//
// REVIEW: Uses useState atoms instead of TanStack Form + Zod. The
// multi-section form (general / business hours / allowed domains) interacts
// heavily with structured JSON fields that don't map cleanly to a flat Zod
// schema. Migrating to useEntityForm is tracked as a separate refactor.
// -----------------------------------------------------------------------
interface LiveChatFormProps {
  initialIsEnabled: boolean;
  initialPrimaryColor: string;
  initialGreetingMessage: string;
  initialBusinessHours: BusinessHoursJson;
  initialUseBusinessHours: boolean;
  initialAllowedDomains: string[];
  embedScript: string;
  isLoadingScript: boolean;
}

function LiveChatForm({
  initialIsEnabled,
  initialPrimaryColor,
  initialGreetingMessage,
  initialBusinessHours,
  initialUseBusinessHours,
  initialAllowedDomains,
  embedScript,
  isLoadingScript,
}: LiveChatFormProps) {
  const updateConfig = useUpdateLiveChatConfig();

  const [isEnabled, setIsEnabled] = useState(initialIsEnabled);
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor);
  const [greetingMessage, setGreetingMessage] = useState(
    initialGreetingMessage,
  );
  const [businessHours, setBusinessHours] =
    useState<BusinessHoursJson>(initialBusinessHours);
  const [useBusinessHours, setUseBusinessHours] = useState(
    initialUseBusinessHours,
  );
  const [allowedDomains, setAllowedDomains] = useState<string[]>(
    initialAllowedDomains,
  );
  const [newDomain, setNewDomain] = useState('');
  const [scriptCopied, setScriptCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [primaryColorError, setPrimaryColorError] = useState<string | null>(
    null,
  );

  const handlePrimaryColorChange = (value: string) => {
    setPrimaryColor(value);
    if (value && !isValidHex(value)) {
      setPrimaryColorError('Enter a valid hex colour, e.g. #1868db');
    } else {
      setPrimaryColorError(null);
    }
  };

  const handleDayToggle = (day: BusinessHoursDay, enabled: boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...(prev[day] ?? DEFAULT_DAY_CONFIG),
        enabled,
      },
    }));
  };

  const handleDayTime = (
    day: BusinessHoursDay,
    field: 'open' | 'close',
    value: string,
  ) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...(prev[day] ?? DEFAULT_DAY_CONFIG),
        [field]: value,
      },
    }));
  };

  const handleAddDomain = () => {
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed || allowedDomains.includes(trimmed)) return;
    setAllowedDomains(prev => [...prev, trimmed]);
    setNewDomain('');
  };

  const handleRemoveDomain = (domain: string) => {
    setAllowedDomains(prev => prev.filter(d => d !== domain));
  };

  const handleSave = async () => {
    // Block save if client-side colour validation already found a problem.
    if (primaryColorError) {
      toast('Validation error', {
        description: primaryColorError,
        variant: 'warning',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({
        isEnabled,
        primaryColor,
        greetingMessage,
        businessHoursJson: useBusinessHours
          ? serializeBusinessHours(businessHours)
          : null,
        allowedDomains,
      });
      toast('Saved', {
        description: 'Live chat settings saved.',
        variant: 'success',
      });
    } catch (err: unknown) {
      // Extract the server ProblemDetails message when available so the user
      // sees the actual validation error instead of a generic fallback.
      // REVIEW: Axios wraps the response under err.response.data; the backend
      // returns ProblemDetails with a 'detail' field for validation errors.
      const axiosErr = err as {
        response?: {
          data?: {
            detail?: string;
            title?: string;
            errors?: Record<string, string[]>;
          };
        };
        message?: string;
      };
      const serverDetail =
        axiosErr?.response?.data?.detail ??
        (axiosErr?.response?.data?.errors
          ? Object.values(axiosErr.response.data.errors).flat().join(' ')
          : undefined) ??
        axiosErr?.response?.data?.title;
      toast('Error', {
        description: serverDetail ?? 'Failed to save live chat settings.',
        variant: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(embedScript);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    } catch {
      toast('Error', {
        description: 'Failed to copy to clipboard.',
        variant: 'danger',
      });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* General Settings */}
      <BaseCard>
        <h2 className="text-base font-semibold">General</h2>

        {/* Enable toggle */}
        <div className="border-light flex items-center justify-between border-b py-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Enable live chat widget</h3>
            <p className="text-default-500 mt-1 text-xs">
              When enabled, the widget will be served to tenants on your
              website.
            </p>
          </div>
          <BaseToggle isSelected={isEnabled} onChange={setIsEnabled} />
        </div>

        {/* Primary color */}
        <div className="border-light border-b py-3">
          <label
            htmlFor="live-chat-primary-color"
            className="mb-2 block text-sm font-semibold"
          >
            Primary colour
          </label>
          <p className="text-default-500 mb-3 text-xs">
            Hex colour for the widget button and header (e.g. #1868db).
          </p>
          <div className="flex max-w-xs items-center gap-3">
            <input
              id="live-chat-primary-color"
              type="color"
              value={isValidHex(primaryColor) ? primaryColor : '#1868db'}
              onChange={e => handlePrimaryColorChange(e.target.value)}
              className="border-light h-10 w-10 cursor-pointer rounded border"
              disabled={!isEnabled}
            />
            <BaseInput
              value={primaryColor}
              onValueChange={handlePrimaryColorChange}
              placeholder="#1868db"
              isDisabled={!isEnabled}
              className="flex-1"
              aria-label="Primary colour hex value"
              isInvalid={!!primaryColorError}
              errorMessage={primaryColorError ?? undefined}
            />
          </div>
        </div>

        {/* Greeting message */}
        <div className="py-3">
          <label
            htmlFor="live-chat-greeting"
            className="mb-2 block text-sm font-semibold"
          >
            Greeting message
          </label>
          <p className="text-default-500 mb-3 text-xs">
            Shown to visitors before they start a conversation.
          </p>
          <BaseTextarea
            id="live-chat-greeting"
            value={greetingMessage}
            onValueChange={setGreetingMessage}
            placeholder="Hi! How can we help you today?"
            minRows={2}
            maxRows={4}
            isDisabled={!isEnabled}
          />
        </div>
      </BaseCard>

      {/* Business Hours */}
      <BaseCard>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Business hours</h2>
            <p className="text-default-500 mt-1 text-xs">
              Restrict widget availability to specific hours. Leave off for 24/7
              availability.
            </p>
          </div>
          <BaseToggle
            isSelected={useBusinessHours}
            onChange={setUseBusinessHours}
            isDisabled={!isEnabled}
          />
        </div>

        {useBusinessHours && (
          <div className="space-y-3 pt-2">
            {DAYS_OF_WEEK.map(day => {
              const dayConfig: BusinessHoursDayConfig =
                businessHours[day] ?? DEFAULT_DAY_CONFIG;
              return (
                <div
                  key={day}
                  className="border-default-100 flex items-center gap-4 border-b py-2 last:border-0"
                >
                  <div className="flex w-24 items-center gap-2">
                    <BaseToggle
                      isSelected={dayConfig.enabled}
                      onChange={val => handleDayToggle(day, val)}
                      isDisabled={!isEnabled}
                    />
                    <span className="text-sm">{DAY_LABELS[day]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BaseInput
                      type="time"
                      value={dayConfig.open}
                      onChange={e => handleDayTime(day, 'open', e.target.value)}
                      isDisabled={!isEnabled || !dayConfig.enabled}
                      className="w-32"
                      size="sm"
                    />
                    <span className="text-default-400 text-sm">to</span>
                    <BaseInput
                      type="time"
                      value={dayConfig.close}
                      onChange={e =>
                        handleDayTime(day, 'close', e.target.value)
                      }
                      isDisabled={!isEnabled || !dayConfig.enabled}
                      className="w-32"
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BaseCard>

      {/* Allowed Domains */}
      <BaseCard>
        <div>
          <h2 className="text-base font-semibold">Allowed domains</h2>
          <p className="text-default-500 mt-1 text-xs">
            Restrict the widget to specific domains. Leave empty to allow any
            domain.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <BaseInput
            value={newDomain}
            onValueChange={setNewDomain}
            placeholder="example.com"
            isDisabled={!isEnabled}
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
          />
          <BaseButton
            size="sm"
            variant="bordered"
            color="light"
            onPress={handleAddDomain}
            isDisabled={!isEnabled || !newDomain.trim()}
          >
            Add
          </BaseButton>
        </div>

        {allowedDomains.length > 0 && (
          <ul className="space-y-2">
            {allowedDomains.map(domain => (
              <li
                key={domain}
                className="bg-default-50 border-light flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="font-mono text-sm">{domain}</span>
                <IconTip label={`Remove ${domain}`}>
                  <BaseButton
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => handleRemoveDomain(domain)}
                    isDisabled={!isEnabled}
                    aria-label={`Remove ${domain}`}
                  >
                    <Icon name="x-mark" className="h-4 w-4" />
                  </BaseButton>
                </IconTip>
              </li>
            ))}
          </ul>
        )}
      </BaseCard>

      {/* Save */}
      <div className="flex justify-start">
        <BaseButton color="primary" onPress={handleSave} isDisabled={isSaving}>
          Save Settings
        </BaseButton>
      </div>

      {/* Embed Script */}
      <BaseCard>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Embed script</h2>
            <p className="text-default-500 mt-1 text-xs">
              Paste this snippet into the {'<head>'} of your website to display
              the live chat widget.
            </p>
          </div>
          <BaseButton
            size="sm"
            variant="bordered"
            color="light"
            onPress={handleCopyScript}
            isDisabled={isLoadingScript || !embedScript}
            startContent={
              <Icon
                name={scriptCopied ? 'check' : 'clipboard'}
                className="h-4 w-4"
              />
            }
          >
            {scriptCopied ? 'Copied!' : 'Copy'}
          </BaseButton>
        </div>

        <pre className="bg-default-50 border-light overflow-x-auto whitespace-pre-wrap rounded-lg border p-4 font-mono text-xs">
          {isLoadingScript
            ? 'Loading...'
            : embedScript ||
              '<!-- Enable live chat and save settings to generate the embed script -->'}
        </pre>
      </BaseCard>
    </div>
  );
}

// -----------------------------------------------------------------------
// Page wrapper — fetches config, passes it to LiveChatForm with key.
// key={config?.id ?? 'loading'} ensures form remounts when config first
// loads, initialising all form atoms from server values without useEffect.
// -----------------------------------------------------------------------
function LiveChatPage() {
  const { config, isLoading } = useGetLiveChatConfig();
  const { embedScript, isLoading: isLoadingScript } =
    useGetLiveChatEmbedScript();

  return (
    <PageBody>
      <PageHeader
        title="Live Chat Widget"
        breadcrumbsKey="configuration.live-chat"
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <span className="text-default-400">Loading configuration...</span>
        </div>
      ) : (
        <LiveChatForm
          key={config?.id ?? 'loading'}
          initialIsEnabled={config?.isEnabled ?? false}
          initialPrimaryColor={config?.primaryColor ?? '#1868db'}
          initialGreetingMessage={
            config?.greetingMessage ?? 'Hi! How can we help you today?'
          }
          initialBusinessHours={parseBusinessHours(config?.businessHoursJson)}
          initialUseBusinessHours={config?.businessHoursJson != null}
          initialAllowedDomains={config?.allowedDomains ?? []}
          embedScript={embedScript}
          isLoadingScript={isLoadingScript}
        />
      )}
    </PageBody>
  );
}

export default LiveChatPage;
