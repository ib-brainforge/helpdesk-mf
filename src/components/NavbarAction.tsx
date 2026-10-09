import { hubConnectedAtom } from '@/state/config';
import type { Workspace } from '@/workspaces';
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
        /*
          Tracking's mode buttons: bare icons the full height of the navbar,
          the active one tinted on a light grey tile with an underline along
          the navbar's bottom edge, and a divider before the AI button and the bell.
        */
        <fieldset
          aria-label="Workspace"
          className="m-0 flex h-[54px] min-w-0 items-stretch gap-1 border-0 border-r border-solid border-r-[#d1d9e0] p-0 pr-3"
        >
          {workspaces.map(workspace => {
            const isActive = workspace.key === activeKey;
            const WorkspaceIcon = workspace.icon;
            return (
              /*
                  A native title, not IconTip: this node renders inside the
                  shared navbar, outside Helpdesk's HeroUI provider, where the
                  library tooltip never opens. The title works in both the
                  standalone and the embedded navbar.
                */
              <button
                key={workspace.key}
                type="button"
                title={workspace.label}
                aria-label={workspace.label}
                aria-pressed={isActive}
                data-testid={workspace.testId}
                onClick={() => {
                  if (!isActive) onNavigate(workspace.home);
                }}
                className={`-mb-px flex w-10 items-center justify-center border-0 border-b-2 border-solid bg-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue ${
                  isActive
                    ? 'border-b-[#1868db] bg-[#EBECF0] text-[#6a9a1f] dark:bg-[#A6C5E229]'
                    : 'border-b-transparent text-[#59636e] hover:text-[#292a2e]'
                }`}
              >
                <WorkspaceIcon className="h-6 w-6" strokeWidth={1.5} />
              </button>
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
