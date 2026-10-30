import { ModalHeader } from '@/components/shared';
import {
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
} from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { Spinner } from '@heroui/react';
import type { FC } from 'react';
import { formatIsoDay } from '../deadlinePolicy';
import { useUpcomingHolidays } from '../hooks/useCompanyDeadlines';

interface HolidaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** A holiday region code ("NSW"). */
  region: string | null;
}

/** The public holidays the clock skips in the next 12 months. Loaded only when opened. */
export const HolidaysModal: FC<HolidaysModalProps> = ({
  isOpen,
  onClose,
  region,
}) => {
  const { days, isLoading, isError } = useUpcomingHolidays(region, isOpen);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="md">
      <BaseModalContent>
        <ModalHeader>{region} public holidays, next 12 months</ModalHeader>
        <BaseModalBody>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : isError ? (
            <p className="text-danger text-sm">
              Couldn't load the holidays. Close this and try again.
            </p>
          ) : (
            <ul className="divide-default-200 divide-y text-sm">
              {days.map(h => (
                <li key={h.date} className="flex justify-between gap-4 py-2">
                  <span>{h.name}</span>
                  <span className="text-default-500 tabular-nums">
                    {formatIsoDay(h.date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={onClose}>
            Close
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
