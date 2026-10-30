import { useConfirm } from '@brainforgeau/components/page';
import { useBlocker } from '@modern-js/runtime/router';
import { useCallback, useEffect, useRef } from 'react';

/**
 * "Discard changes?" before unsaved edits are lost: on Cancel (call
 * `confirmDiscard`) and on leaving for another page in the app (the
 * router's blocker). Closing or reloading the tab is useEntityForm's own
 * beforeunload guard, so it is not repeated here. Render `dialog` once.
 */
export const useDiscardGuard = (isDirty: boolean) => {
  const { confirm, dialog } = useConfirm();

  const ask = useCallback(
    () =>
      confirm({
        title: 'Discard changes?',
        body: "Your changes haven't been saved. Leaving now throws them away.",
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        destructive: true,
      }),
    [confirm],
  );

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );
  // Asked once per blocked navigation, however often the page re-renders.
  const asking = useRef(false);
  useEffect(() => {
    if (blocker.state !== 'blocked' || asking.current) return;
    asking.current = true;
    void ask().then(ok => {
      asking.current = false;
      if (ok) blocker.proceed();
      else blocker.reset();
    });
  }, [blocker, ask]);

  /** True when there is nothing to lose, or the user chose to discard. */
  const confirmDiscard = useCallback(
    () => (isDirty ? ask() : Promise.resolve(true)),
    [isDirty, ask],
  );

  return { confirmDiscard, dialog };
};
