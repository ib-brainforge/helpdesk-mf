import { IconTip } from '@/components/shared';
import { hubConnectedAtom } from '@/state/config';
import type { Workspace } from '@/workspaces';
import { Icon } from '@brainforgeau/components/base';
import { SignalIcon } from '@heroicons/react/24/solid';
import { useAtomValue } from 'jotai';
import type { FC } from 'react';

interface HelpdeskNavbarActionProps {
  /** The workspaces this user can open. The switcher shows when there are two or more. */
  workspaces: readonly Workspace[];
  activeKey: Workspace['key'];
  /**
   * Helpdesk's router navigate, captured by routes/layout.tsx. This node is
   * drawn by the shared navbar, in the navbar's React tree, where Helpdesk's
   * router is not available (embedded under the shell it belongs to another
   * app altogether), so no NavLink or useNavigate in here.
   */
  onNavigate: (to: string) => void;
}

/**
 * What Helpdesk puts in the shared navbar's action slot (setAction from
 * useNavbarAction), left of the AI button and the bell: the workspace
 * switcher, the same idea as Tracking's Dashboard / Map buttons, and the
 * live-connection signal. The slot holds one node, so both are one group.
 */
export const HelpdeskNavbarAction: FC<HelpdeskNavbarActionProps> = ({
  workspaces,
  activeKey,
  onNavigate,
}) => {
  const hubConnected = useAtomValue(hubConnectedAtom);
  return (
    <div className="flex items-center gap-2">
      {workspaces.length > 1 && (
        <fieldset
          aria-label="Workspace"
          className="m-0 flex min-w-0 items-center gap-0.5 rounded-lg border-0 bg-default-100 p-0.5"
        >
          {workspaces.map(workspace => {
            const isActive = workspace.key === activeKey;
            return (
              <IconTip key={workspace.key} label={workspace.label}>
                <button
                  type="button"
                  aria-label={workspace.label}
                  aria-pressed={isActive}
                  data-testid={workspace.testId}
                  onClick={() => {
                    if (!isActive) onNavigate(workspace.home);
                  }}
                  className={`flex h-7 w-8 items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue ${
                    isActive
                      ? 'border-blue bg-white text-blue dark:bg-zinc-900'
                      : 'border-transparent text-default-500 hover:text-default-700'
                  }`}
                >
                  <Icon name={workspace.icon} className="h-4 w-4" />
                </button>
              </IconTip>
            );
          })}
        </fieldset>
      )}
      {hubConnected && (
        <span
          className="flex items-center gap-1 text-green-500"
          title="Live connection active"
        >
          <SignalIcon className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
};
