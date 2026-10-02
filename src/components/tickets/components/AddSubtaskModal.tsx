import { ModalHeader } from '@/components/shared';
import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseTextarea,
} from '@brainforgeau/components';
import { type FC, useState } from 'react';

interface AddSubtaskModalProps {
  isOpen: boolean;
  parentTicketId: string;
  onClose: () => void;
  onSubmit: (data: { subject: string; description?: string }) => void;
  isLoading?: boolean;
}

export const AddSubtaskModal: FC<AddSubtaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [subjectError, setSubjectError] = useState('');

  const handleSubmit = () => {
    if (!subject.trim()) {
      setSubjectError('Subject is required');
      return;
    }
    setSubjectError('');
    onSubmit({
      subject: subject.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleClose = () => {
    setSubject('');
    setDescription('');
    setSubjectError('');
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} size="md">
      <BaseModalContent>
        <ModalHeader>Add Subtask</ModalHeader>
        <BaseModalBody>
          <div className="flex flex-col gap-4">
            <BaseInput
              label="Subject"
              placeholder="Enter subtask subject"
              value={subject}
              onValueChange={setSubject}
              isRequired
              isInvalid={!!subjectError}
              errorMessage={subjectError}
              isDisabled={isLoading}
            />
            <BaseTextarea
              label="Description"
              placeholder="Optional description"
              value={description}
              onValueChange={setDescription}
              minRows={3}
              isDisabled={isLoading}
            />
            <p className="text-sm text-default-500">
              The subtask will inherit the parent ticket's assignee, category,
              and priority.
            </p>
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton
            variant="bordered"
            onPress={handleClose}
            isDisabled={isLoading || isLoading}
          >
            Cancel
          </BaseButton>
          <BaseButton color="primary" onPress={handleSubmit}>
            Create Subtask
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
