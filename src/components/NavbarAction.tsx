import { hubConnectedAtom } from '@/state/config';
import { ViewSwitch, type ViewSwitchSegment } from '@brainforgeau/components';
import { SignalIcon } from '@heroicons/react/24/solid';
import { useAtomValue } from 'jotai';
import type { FC } from 'react';

interface HelpdeskNavbarActionProps {
  /**
   * The views this person holds, Tenant first. The switch shows when there are
   * two or more. Navigation is bound by routes/layout.tsx: this node is drawn
   * by the shared navbar, in the navbar's React tree, where Helpdesk's router
   * is not available (embedded under the shell it belongs to another app
   * altogether), so no NavLink or useNavigate in here.
   */
  segments: ViewSwitchSegment[];
}

/**
 * What Helpdesk puts in the shared navbar's action slot (setAction from
 * useNavbarAction), left of the AI button and the bell: the Tenant / Provider
 * view switch, which also carries the live-connection signal. With no views to
 * switch between, only the signal shows.
 */
export const HelpdeskNavbarAction: FC<HelpdeskNavbarActionProps> = ({
  segments,
}) => {
  const hubConnected = useAtomValue(hubConnectedAtom);
  if (segments.length > 1) {
    return <ViewSwitch segments={segments} live={hubConnected} />;
  }
  return hubConnected ? (
    <span
      className="flex items-center gap-1 text-green-500"
      title="Live connection active"
    >
      <SignalIcon className="h-3.5 w-3.5" />
    </span>
  ) : null;
};
