import {
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalHeader,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Card, CardContent, Spinner, toast } from '@heroui/react';
import { useState } from 'react';
import { useGetTicketSummary, useSuggestReply } from '../hooks/useAiAssist';

type AiAssistantModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
};

type ActiveFeature = 'ticket-summary' | 'generate-response' | null;

const AI_COMING_SOON_FEATURES = [
  {
    id: 'improve-reply',
    icon: 'sparkles',
    title: 'Improve reply',
    description: 'Enhance your response',
  },
  {
    id: 'generate-kb',
    icon: 'book-open',
    title: 'Generate KB',
    description: 'Create knowledge base article',
  },
  {
    id: 'custom-ai-chat',
    icon: 'chat-bubble-bottom-center-text',
    title: 'Custom AI-chat',
    description: 'Ask AI anything',
  },
];

function isAiNotConfiguredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const axiosError = error as { response?: { data?: { errors?: string[] } } };
  const errors = axiosError.response?.data?.errors ?? [];
  return errors.some((e: string) => e.startsWith('AI_NOT_CONFIGURED'));
}

export function AiAssistantModal({
  isOpen,
  onClose,
  ticketId,
}: AiAssistantModalProps) {
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const summaryMutation = useGetTicketSummary();
  const suggestReplyMutation = useSuggestReply();

  const isLoading = summaryMutation.isPending || suggestReplyMutation.isPending;

  const handleClose = () => {
    setActiveFeature(null);
    setAiResult(null);
    summaryMutation.reset();
    suggestReplyMutation.reset();
    onClose();
  };

  const handleTicketSummary = async () => {
    setActiveFeature('ticket-summary');
    setAiResult(null);
    try {
      const result = await summaryMutation.mutateAsync(ticketId);
      setAiResult(result.result);
    } catch (error) {
      if (isAiNotConfiguredError(error)) {
        // handled in render
      } else {
        toast('AI error', { description: 'Failed to get ticket summary. Please try again.', variant: 'danger' });
        setActiveFeature(null);
      }
    }
  };

  const handleSuggestReply = async () => {
    setActiveFeature('generate-response');
    setAiResult(null);
    try {
      const result = await suggestReplyMutation.mutateAsync(ticketId);
      setAiResult(result.result);
    } catch (error) {
      if (isAiNotConfiguredError(error)) {
        // handled in render
      } else {
        toast('AI error', { description: 'Failed to get reply suggestion. Please try again.', variant: 'danger' });
        setActiveFeature(null);
      }
    }
  };

  const handleComingSoon = () => {
    toast('Coming soon', { description: 'AI features will be available soon', variant: 'warning' });
  };

  const hasAiError =
    (activeFeature === 'ticket-summary' &&
      summaryMutation.error &&
      isAiNotConfiguredError(summaryMutation.error)) ||
    (activeFeature === 'generate-response' &&
      suggestReplyMutation.error &&
      isAiNotConfiguredError(suggestReplyMutation.error));

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} size="2xl">
      <BaseModalContent>
        <BaseModalHeader>
          <div className="flex items-center gap-2">
            <Icon name="flash" className="h-5 w-5 text-primary" />
            <span>Jitbit AI Assistant</span>
          </div>
        </BaseModalHeader>
        <BaseModalBody className="pb-6">
          {/* Result panel */}
          {(isLoading || aiResult || hasAiError) && (
            <div className="mb-4 rounded-lg border border-default-200 bg-default-50 p-4 min-h-[80px] flex items-start">
              {isLoading && (
                <div className="flex items-center gap-3 text-default-500 text-sm">
                  <Spinner size="sm" />
                  <span>Generating...</span>
                </div>
              )}
              {!isLoading && hasAiError && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-warning-600 font-medium">
                    AI features are not configured
                  </p>
                  <p className="text-sm text-default-500">
                    Contact your administrator to configure the AI provider for this deployment.
                  </p>
                </div>
              )}
              {!isLoading && aiResult && (
                <p className="text-sm text-default-700 whitespace-pre-wrap">
                  {aiResult}
                </p>
              )}
            </div>
          )}

          <p className="text-sm text-default-500 mb-4">
            How can AI help you with this ticket?
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Generate response — real */}
            <button
              type="button"
              onClick={handleSuggestReply}
              disabled={isLoading}
              className="text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
            <Card
              className="hover:border-primary transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                    <Icon
                      name="chat-bubble-left-right"
                      className="h-6 w-6 text-primary"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-0.5">
                      Generate response
                    </h3>
                    <p className="text-xs text-default-500">
                      AI-powered reply suggestions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </button>

            {/* Ticket summary — real */}
            <button
              type="button"
              onClick={handleTicketSummary}
              disabled={isLoading}
              className="text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
            <Card
              className="hover:border-primary transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                    <Icon
                      name="document-text"
                      className="h-6 w-6 text-primary"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-0.5">
                      Ticket summary
                    </h3>
                    <p className="text-xs text-default-500">
                      Quick overview of the ticket
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </button>

            {/* Improve reply — coming soon */}
            <button
              type="button"
              onClick={handleComingSoon}
              className="text-left"
            >
            <Card
              className="hover:border-primary transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                    <Icon name="sparkles" className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-0.5">
                      Improve reply
                    </h3>
                    <p className="text-xs text-default-500">
                      Enhance your response
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </button>

            {/* Generate KB — coming soon */}
            <button
              type="button"
              onClick={handleComingSoon}
              className="text-left"
            >
            <Card
              className="hover:border-primary transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                    <Icon name="book-open" className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-0.5">
                      Generate KB
                    </h3>
                    <p className="text-xs text-default-500">
                      Create knowledge base article
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </button>
          </div>

          {/* Custom AI-chat — full width, coming soon */}
          <button
            type="button"
            onClick={handleComingSoon}
            className="w-full text-left"
          >
          <Card
            className="hover:border-primary transition-colors mt-3"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Icon
                    name="chat-bubble-bottom-center-text"
                    className="h-6 w-6 text-primary"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-0.5">
                    Custom AI-chat
                  </h3>
                  <p className="text-xs text-default-500">Ask AI anything</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </button>
        </BaseModalBody>
      </BaseModalContent>
    </BaseModal>
  );
}
