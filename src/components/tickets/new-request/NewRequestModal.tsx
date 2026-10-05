import {
  BaseModal,
  BaseModalBody,
  BaseModalContent,
} from '@brainforgeau/components';
import type { FC } from 'react';
import { NewRequestWizard } from './NewRequestWizard';

/**
 * The request wizard as an overlay.
 *
 * Raising a request is an interruption of whatever the person was already
 * doing, usually reading the ticket list. An overlay keeps that context behind
 * the dialog and returns them to it on cancel, where a route change loses the
 * scroll position, the tab and the filters.
 *
 * The header is written here rather than using BaseModalHeader. That component
 * renders the shell's own title bar, which duplicated the words "New request"
 * and carried minimise and maximise controls. Neither does anything useful for
 * a five step form: there is nothing to come back to once minimised, and the
 * dialog is already sized to fit. A single close cross is the only control the
 * chrome needs.
 *
 * The dialog takes the screen's full height, less 16px each side, rather than
 * the 104px above and below every other modal gets (64px of margin on the
 * dialog plus 40px of padding on its container). On a laptop that space is
 * the difference between the ten request types fitting and the first step
 * scrolling. The `!` classes beat the container's own max-height rule, and the
 * padding is set in the scoped style rule below for the same reason as the
 * backdrop: BaseModal has no class hook for that element.
 *
 * scrollBehavior="inside" is a safety net only. Every step is sized to fit
 * without scrolling, which is why the questions are paged. Should a step still
 * outgrow a very short screen, scrolling inside keeps the footer's buttons in
 * view, where scrolling the page would push them off the bottom.
 *
 * isDismissable is off. A stray click on the backdrop part way through a five
 * field questionnaire would discard the lot with no warning, and the dialog
 * already offers Cancel as the deliberate way out.
 *
 * backdrop="opaque" dims the page behind the dialog. The component's default
 * variant paints bg-gray/50, which over a white ticket list reads as a faint
 * haze rather than a state change, leaving the grid behind competing for
 * attention with the form in front. Dimming it settles which one is live,
 * which matters more here than usual because the backdrop is not clickable.
 */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (ticketId: string) => void;
}

export const NewRequestModal: FC<Props> = ({ isOpen, onClose, onCreated }) => (
  <BaseModal
    isOpen={isOpen}
    onClose={onClose}
    size="4xl"
    scrollBehavior="inside"
    className="!my-auto !max-h-full"
    isDismissable={false}
    backdrop="opaque"
    aria-label="New request"
  >
    <BaseModalContent>
      {/*
        The backdrop slot is painted bg-gray/50 by the component's default
        variant, which over a white ticket list reads as a faint haze rather
        than a state change. BaseModal exposes no class hook for that slot
        (className lands on the dialog), so the rule is scoped with :has() to
        the marker below and darkens this dialog's backdrop only, leaving every
        other modal in the app exactly as it was. The container's padding is
        trimmed the same way, so the dialog can use the screen's height.
      */}
      <style>{`
        body:has([data-new-request-dialog]) [data-slot='modal-backdrop'] {
          background-color: rgb(0 0 0 / 0.55);
        }
        body:has([data-new-request-dialog]) .modal__container {
          padding: 16px;
        }
      `}</style>
      <div data-new-request-dialog hidden />
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <h2 className="text-lg font-semibold">New request</h2>
        {/*
          A plain button with an inline glyph. BaseButton's `icon` slot rendered
          empty at size="none" here, leaving a clickable but invisible control,
          which is worse than no close button at all.
        */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="text-light-gray hover:text-dark -mr-1 flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <BaseModalBody>
        {/*
          Remounted per open via `key`, so a cancelled request does not come
          back half filled with the previous attempt's answers. The wizard holds
          its own step and answers in local state and has no reset of its own.
        */}
        {isOpen && (
          <NewRequestWizard
            key={String(isOpen)}
            onCreated={id => {
              onClose();
              onCreated?.(id);
            }}
            onCancel={onClose}
          />
        )}
      </BaseModalBody>
    </BaseModalContent>
  </BaseModal>
);
