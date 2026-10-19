import { ModalHeader } from '@/components/shared';
import {
  BaseCard,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Card, CardContent, Spinner, toast } from '@heroui/react';
import { useRef, useState } from 'react';
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

  // AbortController ref — a new controller is created per request; cancelled on modal close.
  const abortControllerRef = useRef<AbortController | null>(null);

  const isLoading = summaryMutation.isPending || suggestReplyMutation.isPending;

  const handleClose = () => {
    // Cancel any in-flight AI request before resetting state.
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setActiveFeature(null);
    setAiResult(null);
    summaryMutation.reset();
    suggestReplyMutation.reset();
    onClose();
  };

  const handleTicketSummary = async () => {
    setActiveFeature('ticket-summary');
    setAiResult(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await summaryMutation.mutateAsync({
        ticketId,
        signal: controller.signal,
      });
      setAiResult(result.result);
    } catch (error) {
      if (isAiNotConfiguredError(error)) {
        // handled in render
      } else {
        toast('AI error', {
          description: 'Failed to get ticket summary. Please try again.',
          variant: 'danger',
        });
        setActiveFeature(null);
      }
    }
  };

  const handleSuggestReply = async () => {
    setActiveFeature('generate-response');
    setAiResult(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await suggestReplyMutation.mutateAsync({
        ticketId,
        signal: controller.signal,
      });
      setAiResult(result.result);
    } catch (error) {
      if (isAiNotConfiguredError(error)) {
        // handled in render
      } else {
        toast('AI error', {
          description: 'Failed to get reply suggestion. Please try again.',
          variant: 'danger',
        });
        setActiveFeature(null);
      }
    }
  };

  const handleComingSoon = () => {
    toast('Coming soon', {
      description: 'AI features will be available soon',
      variant: 'warning',
    });
  };

  const hasAiError =
    (activeFeature === 'ticket-summary' &&
      summaryMutation.error &&
      isAiNotConfiguredError(summaryMutation.error)) ||
    (activeFeature === 'generate-response' &&
      suggestReplyMutation.error &&
      isAiNotConfiguredError(suggestReplyMutation.error));

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      className="max-w-2xl"
    >
      <BaseModalContent>
        <ModalHeader onClose={handleClose}>
          <span className="inline-flex items-center gap-2">
            <Icon name="flash" className="text-primary h-5 w-5" />
            <span>Jitbit AI Assistant</span>
          </span>
        </ModalHeader>
        <BaseModalBody className="pb-6">
          {/* Result panel */}
          {(isLoading || aiResult || hasAiError) && (
            <div className="border-light bg-default-50 mb-4 flex min-h-[80px] items-start rounded-lg border p-4">
              {isLoading && (
                <div className="text-default-500 flex items-center gap-3 text-sm">
                  <Spinner size="sm" />
                  <span>Generating...</span>
                </div>
              )}
              {!isLoading && hasAiError && (
                <div className="flex flex-col gap-1">
                  <p className="text-warning-600 text-sm font-medium">
                    AI features are not configured
                  </p>
                  <p className="text-default-500 text-sm">
                    Contact your administrator to configure the AI provider for
                    this deployment.
                  </p>
                </div>
              )}
              {!isLoading && aiResult && (
                <p className="text-default-700 whitespace-pre-wrap text-sm">
                  {aiResult}
                </p>
              )}
            </div>
          )}

          <p className="text-default-500 mb-4 text-sm">
            How can AI help you with this ticket?
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Generate response — real */}
            <button
              type="button"
              onClick={handleSuggestReply}
              disabled={isLoading}
              className="text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BaseCard className="hover:border-primary transition-colors">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="bg-primary-50 flex h-12 w-12 items-center justify-center rounded-full">
                    <Icon name="chat" className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="mb-0.5 text-sm font-semibold">
                      Generate response
                    </h3>
                    <p className="text-default-500 text-xs">
                      AI-powered reply suggestions
                    </p>
                  </div>
                </div>
              </BaseCard>
            </button>

            {/* Ticket summary — real */}
            <button
              type="button"
              onClick={handleTicketSummary}
              disabled={isLoading}
              className="text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BaseCard className="hover:border-primary transition-colors">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="bg-primary-50 flex h-12 w-12 items-center justify-center rounded-full">
                    <Icon name="doc" className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="mb-0.5 text-sm font-semibold">
                      Ticket summary
                    </h3>
                    <p className="text-default-500 text-xs">
                      Quick overview of the ticket
                    </p>
                  </div>
                </div>
              </BaseCard>
            </button>

            {/* Improve reply — coming soon */}
            <button
              type="button"
              onClick={handleComingSoon}
              className="text-left"
            >
              <BaseCard className="hover:border-primary transition-colors">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="bg-primary-50 flex h-12 w-12 items-center justify-center rounded-full">
                    <Icon
                      name="SparklesIcon"
                      className="text-primary h-6 w-6"
                    />
                  </div>
                  <div>
                    <h3 className="mb-0.5 text-sm font-semibold">
                      Improve reply
                    </h3>
                    <p className="text-default-500 text-xs">
                      Enhance your response
                    </p>
                  </div>
                </div>
              </BaseCard>
            </button>

            {/* Generate KB — coming soon */}
            <button
              type="button"
              onClick={handleComingSoon}
              className="text-left"
            >
              <BaseCard className="hover:border-primary transition-colors">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="bg-primary-50 flex h-12 w-12 items-center justify-center rounded-full">
                    <Icon
                      name="BookOpenIcon"
                      className="text-primary h-6 w-6"
                    />
                  </div>
                  <div>
                    <h3 className="mb-0.5 text-sm font-semibold">
                      Generate KB
                    </h3>
                    <p className="text-default-500 text-xs">
                      Create knowledge base article
                    </p>
                  </div>
                </div>
              </BaseCard>
            </button>
          </div>

          {/* Custom AI-chat — full width, coming soon */}
          <button
            type="button"
            onClick={handleComingSoon}
            className="w-full text-left"
          >
            <BaseCard className="hover:border-primary mt-3 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-primary-50 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full">
                  <Icon name="comment" className="text-primary h-6 w-6" />
                </div>
                <div>
                  <h3 className="mb-0.5 text-sm font-semibold">
                    Custom AI-chat
                  </h3>
                  <p className="text-default-500 text-xs">Ask AI anything</p>
                </div>
              </div>
            </BaseCard>
          </button>
        </BaseModalBody>
      </BaseModalContent>
    </BaseModal>
  );
}
