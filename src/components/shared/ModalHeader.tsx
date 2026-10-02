import {
  BaseModalHeaderActionButton,
  useModalContext,
} from '@brainforgeau/components';
import {
  ModalHeader as HeroModalHeader,
  ModalHeading,
  cn,
} from '@heroui/react';
import type { FC, ReactNode } from 'react';

interface ModalHeaderProps {
  /** The heading. Pass it here or as children, not both. */
  title?: ReactNode;
  children?: ReactNode;
  /** Defaults to closing the surrounding BaseModal, which calls its onClose. */
  onClose?: () => void;
  className?: string;
}

/**
 * The header every helpdesk modal uses: its title once, and a close button.
 *
 * WHY NOT BaseModalHeader
 * BaseModalHeader (@brainforgeau/components) renders `title` AND `children`,
 * and most helpdesk modals passed the same text as both, so the title showed
 * twice ("Link Asset   Link Asset"). It also always renders minimise and
 * maximise buttons, which no helpdesk modal needs, and shows a close button
 * only when `onClose` is passed, which most callers did not, so most modals
 * had no visible way to close them beyond Cancel or Escape.
 *
 * This renders one heading (children when given, otherwise title) and a single
 * close button that closes the modal through BaseModal's own context, so no
 * caller has to wire it. The heading is react-aria's Heading, so the dialog
 * still takes its accessible name from it.
 */
export const ModalHeader: FC<ModalHeaderProps> = ({
  title,
  children,
  onClose,
  className,
}) => {
  const { close } = useModalContext();
  const heading = children ?? title;

  return (
    <HeroModalHeader
      className={cn(
        'flex shrink-0 flex-row items-center gap-3 px-5 py-5',
        className,
      )}
    >
      <ModalHeading className="-mt-1 flex-1 truncate text-xl font-semibold text-black dark:text-white">
        {heading}
      </ModalHeading>
      <BaseModalHeaderActionButton icon="cross" onClick={onClose ?? close} />
    </HeroModalHeader>
  );
};
