import { useState, useEffect } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, BaseInput, Icon } from '@brainforgeau/components';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardBody, Switch, Textarea, addToast } from '@heroui/react';
import { useGetLiveChatConfig, useUpdateLiveChatConfig, useGetLiveChatEmbedScript } from '@/components/live-chat/hooks/useLiveChat';
import { DAYS_OF_WEEK, DEFAULT_DAY_CONFIG, type BusinessHoursDay, type BusinessHoursDayConfig, type BusinessHoursJson } from '@/types/live-chat';

const DAY_LABELS: Record<BusinessHoursDay, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function parseBusinessHours(json: string | null): BusinessHoursJson {
  if (!json) return {};
  try {
    return JSON.parse(json) as BusinessHoursJson;
  } catch {
    return {};
  }
}

function serializeBusinessHours(hours: BusinessHoursJson): string | null {
  const hasAnyEnabled = Object.values(hours).some(d => d?.enabled);
  const hasAnyDay = Object.keys(hours).length > 0;
  if (!hasAnyDay || !hasAnyEnabled) return null;
  return JSON.stringify(hours);
}

function LiveChatPage() {
  const { config, isLoading } = useGetLiveChatConfig();
  const { embedScript, isLoading: isLoadingScript } = useGetLiveChatEmbedScript();
  const updateConfig = useUpdateLiveChatConfig();

  const [isEnabled, setIsEnabled] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [greetingMessage, setGreetingMessage] = useState('Hi! How can we help you today?');
  const [businessHours, setBusinessHours] = useState<BusinessHoursJson>({});
  const [useBusinessHours, setUseBusinessHours] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [scriptCopied, setScriptCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state from fetched config
  useEffect(() => {
    if (!config) return;
    setIsEnabled(config.isEnabled);
    setPrimaryColor(config.primaryColor);
    setGreetingMessage(config.greetingMessage);
    setAllowedDomains(config.allowedDomains ?? []);
    const parsed = parseBusinessHours(config.businessHoursJson);
    setBusinessHours(parsed);
    setUseBusinessHours(config.businessHoursJson !== null);
  }, [config]);

  const handleDayToggle = (day: BusinessHoursDay, enabled: boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...(prev[day] ?? DEFAULT_DAY_CONFIG),
        enabled,
      },
    }));
  };

  const handleDayTime = (day: BusinessHoursDay, field: 'open' | 'close', value: string) => {
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
    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({
        isEnabled,
        primaryColor,
        greetingMessage,
        businessHoursJson: useBusinessHours ? serializeBusinessHours(businessHours) : null,
        allowedDomains,
      });
      addToast({ title: 'Saved', description: 'Live chat settings saved.', severity: 'success' });
    } catch {
      addToast({ title: 'Error', description: 'Failed to save live chat settings.', severity: 'danger' });
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
      addToast({ title: 'Error', description: 'Failed to copy to clipboard.', severity: 'danger' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-default-400">Loading configuration...</span>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Live Chat Widget - Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Administration', href: '/admin/settings' },
            { label: 'Live Chat Widget', href: '/configuration/live-chat', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Live Chat Widget</h1>
        <p className="text-default-500 mt-1">
          Configure your customer-facing live chat widget and embed it on your website.
        </p>
      </div>

      <div className="max-w-3xl space-y-6">

        {/* General Settings */}
        <Card>
          <CardBody className="p-6 space-y-6">
            <h2 className="text-base font-semibold">General</h2>

            {/* Enable toggle */}
            <div className="flex items-center justify-between py-3 border-b border-default-200">
              <div className="flex-1">
                <h3 className="text-sm font-semibold">Enable live chat widget</h3>
                <p className="text-xs text-default-500 mt-1">
                  When enabled, the widget will be served to customers on your website.
                </p>
              </div>
              <Switch isSelected={isEnabled} onValueChange={setIsEnabled} size="sm" />
            </div>

            {/* Primary color */}
            <div className="py-3 border-b border-default-200">
              <label className="block text-sm font-semibold mb-2">Primary colour</label>
              <p className="text-xs text-default-500 mb-3">
                Hex colour for the widget button and header (e.g. #6366f1).
              </p>
              <div className="flex items-center gap-3 max-w-xs">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-default-200"
                  disabled={!isEnabled}
                />
                <BaseInput
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  placeholder="#6366f1"
                  isDisabled={!isEnabled}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Greeting message */}
            <div className="py-3">
              <label className="block text-sm font-semibold mb-2">Greeting message</label>
              <p className="text-xs text-default-500 mb-3">
                Shown to visitors before they start a conversation.
              </p>
              <Textarea
                value={greetingMessage}
                onValueChange={setGreetingMessage}
                placeholder="Hi! How can we help you today?"
                minRows={2}
                maxRows={4}
                isDisabled={!isEnabled}
              />
            </div>
          </CardBody>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardBody className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Business hours</h2>
                <p className="text-xs text-default-500 mt-1">
                  Restrict widget availability to specific hours. Leave off for 24/7 availability.
                </p>
              </div>
              <Switch
                isSelected={useBusinessHours}
                onValueChange={setUseBusinessHours}
                size="sm"
                isDisabled={!isEnabled}
              />
            </div>

            {useBusinessHours && (
              <div className="space-y-3 pt-2">
                {DAYS_OF_WEEK.map(day => {
                  const dayConfig: BusinessHoursDayConfig = businessHours[day] ?? DEFAULT_DAY_CONFIG;
                  return (
                    <div key={day} className="flex items-center gap-4 py-2 border-b border-default-100 last:border-0">
                      <div className="w-24 flex items-center gap-2">
                        <Switch
                          isSelected={dayConfig.enabled}
                          onValueChange={val => handleDayToggle(day, val)}
                          size="sm"
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
                          onChange={e => handleDayTime(day, 'close', e.target.value)}
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
          </CardBody>
        </Card>

        {/* Allowed Domains */}
        <Card>
          <CardBody className="p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Allowed domains</h2>
              <p className="text-xs text-default-500 mt-1">
                Restrict the widget to specific domains. Leave empty to allow any domain.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <BaseInput
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                placeholder="example.com"
                isDisabled={!isEnabled}
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
              />
              <BaseButton
                size="sm"
                variant="bordered"
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
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-default-50 border border-default-200"
                  >
                    <span className="text-sm font-mono">{domain}</span>
                    <BaseButton
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => handleRemoveDomain(domain)}
                      isDisabled={!isEnabled}
                    >
                      <Icon name="x-mark" className="w-4 h-4" />
                    </BaseButton>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Save */}
        <div className="flex justify-start">
          <BaseButton
            color="primary"
            onPress={handleSave}
            isLoading={isSaving}
          >
            Save Settings
          </BaseButton>
        </div>

        {/* Embed Script */}
        <Card>
          <CardBody className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Embed script</h2>
                <p className="text-xs text-default-500 mt-1">
                  Paste this snippet into the {"<head>"} of your website to display the live chat widget.
                </p>
              </div>
              <BaseButton
                size="sm"
                variant="bordered"
                onPress={handleCopyScript}
                isDisabled={isLoadingScript || !embedScript}
                startContent={<Icon name={scriptCopied ? 'check' : 'clipboard'} className="w-4 h-4" />}
              >
                {scriptCopied ? 'Copied!' : 'Copy'}
              </BaseButton>
            </div>

            <pre className="bg-default-50 border border-default-200 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {isLoadingScript ? 'Loading...' : embedScript || '<!-- Enable live chat and save settings to generate the embed script -->'}
            </pre>
          </CardBody>
        </Card>

      </div>
    </>
  );
}

export default LiveChatPage;
