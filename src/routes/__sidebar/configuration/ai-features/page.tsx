import { useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardBody, Switch, Textarea } from '@heroui/react';
import { addToast } from '@heroui/react';

function AiFeaturesPage() {
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>('openai');
  const [isKbIndexingEnabled, setIsKbIndexingEnabled] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isChatResponsesEnabled, setIsChatResponsesEnabled] = useState(false);

  const handleSave = () => {
    addToast({
      title: 'Backend not available',
      description: 'AI features configuration API is not yet implemented',
      severity: 'warning',
    });
  };

  return (
    <>
      <Helmet>
        <title>AI Features - Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Administration', href: '/admin/settings' },
            { label: 'AI Features', href: '/configuration/ai-features', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">AI Features</h1>
        <p className="text-default-500 mt-1">
          Configure AI-powered assistance and suggestions for your helpdesk
        </p>
      </div>

      <div className="max-w-3xl">
        <Card>
          <CardBody className="p-6 space-y-6">
            <div>
              <p className="text-sm text-default-600 mb-6">
                Enable AI-powered features to help your team work more efficiently. AI can generate
                response suggestions, summarize tickets, improve replies, and more.
              </p>

              {/* Enable AI Features */}
              <div className="flex items-center justify-between py-3 border-b border-default-200">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Enable AI features</h3>
                  <p className="text-xs text-default-500 mt-1">
                    Turn on AI-powered assistance throughout the helpdesk
                  </p>
                </div>
                <Switch
                  isSelected={isAiEnabled}
                  onValueChange={setIsAiEnabled}
                  size="sm"
                />
              </div>

              {/* AI Provider */}
              <div className="py-4 border-b border-default-200">
                <label className="block text-sm font-semibold mb-2">AI Provider</label>
                <BaseSelect
                  placeholder="Select AI provider"
                  selectedKeys={new Set([aiProvider])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string;
                    setAiProvider(key);
                  }}
                  className="max-w-md"
                  isDisabled={!isAiEnabled}
                >
                  <BaseSelectItem key="openai">OpenAI (GPT-4)</BaseSelectItem>
                  <BaseSelectItem key="anthropic">Anthropic (Claude)</BaseSelectItem>
                  <BaseSelectItem key="azure">Azure OpenAI</BaseSelectItem>
                  <BaseSelectItem key="custom">Custom Endpoint</BaseSelectItem>
                </BaseSelect>
              </div>

              {/* Index KB for Suggestions */}
              <div className="flex items-center justify-between py-3 border-b border-default-200">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Index your KB for suggestions</h3>
                  <p className="text-xs text-default-500 mt-1">
                    Allow AI to search your knowledge base for relevant article suggestions
                  </p>
                </div>
                <Switch
                  isSelected={isKbIndexingEnabled}
                  onValueChange={setIsKbIndexingEnabled}
                  size="sm"
                  isDisabled={!isAiEnabled}
                />
              </div>

              {/* Custom Instructions */}
              <div className="py-4 border-b border-default-200">
                <label className="block text-sm font-semibold mb-2">Custom Instructions</label>
                <p className="text-xs text-default-500 mb-3">
                  Provide custom instructions to guide AI responses (optional)
                </p>
                <Textarea
                  placeholder="E.g., Always maintain a professional tone, use company terminology..."
                  value={customInstructions}
                  onValueChange={setCustomInstructions}
                  minRows={4}
                  maxRows={8}
                  isDisabled={!isAiEnabled}
                />
              </div>

              {/* Enable AI Chat Responses */}
              <div className="flex items-center justify-between py-3">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Enable AI chat responses</h3>
                  <p className="text-xs text-default-500 mt-1">
                    Allow AI to generate automatic responses in live chat conversations
                  </p>
                </div>
                <Switch
                  isSelected={isChatResponsesEnabled}
                  onValueChange={setIsChatResponsesEnabled}
                  size="sm"
                  isDisabled={!isAiEnabled}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-default-200">
              <BaseButton
                color="primary"
                onPress={handleSave}
                isDisabled={!isAiEnabled}
              >
                Save Settings
              </BaseButton>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

export default AiFeaturesPage;
