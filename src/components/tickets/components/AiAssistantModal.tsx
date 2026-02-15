import { Modal, ModalContent, ModalHeader, ModalBody, Card, CardBody } from '@heroui/react';
import { Icon } from '@brainforgeau/components/base';
import { addToast } from '@heroui/react';

type AiAssistantModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AI_FEATURES = [
  {
    id: 'generate-response',
    icon: 'chat-bubble-left-right',
    title: 'Generate response',
    description: 'AI-powered reply suggestions',
  },
  {
    id: 'ticket-summary',
    icon: 'document-text',
    title: 'Ticket summary',
    description: 'Quick overview of the ticket',
  },
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

export function AiAssistantModal({ isOpen, onClose }: AiAssistantModalProps) {
  const handleFeatureClick = (featureId: string) => {
    addToast({
      title: 'Coming soon',
      description: 'AI features will be available soon',
      severity: 'warning',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Icon name="flash" className="h-5 w-5 text-primary" />
            <span>Jitbit AI Assistant</span>
          </div>
        </ModalHeader>
        <ModalBody className="pb-6">
          <p className="text-sm text-default-500 mb-4">
            How can AI help you with this ticket?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {AI_FEATURES.slice(0, 4).map((feature) => (
              <Card
                key={feature.id}
                isPressable
                onPress={() => handleFeatureClick(feature.id)}
                className="hover:border-primary transition-colors"
              >
                <CardBody className="p-4">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                      <Icon name={feature.icon} className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-0.5">{feature.title}</h3>
                      <p className="text-xs text-default-500">{feature.description}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
          {/* Last item spans full width */}
          <Card
            isPressable
            onPress={() => handleFeatureClick(AI_FEATURES[4].id)}
            className="hover:border-primary transition-colors mt-3"
          >
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Icon name={AI_FEATURES[4].icon} className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-0.5">{AI_FEATURES[4].title}</h3>
                  <p className="text-xs text-default-500">{AI_FEATURES[4].description}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
