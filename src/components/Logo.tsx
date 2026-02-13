import { IconHeadphones } from '@brainforgeau/components/icons/generated';
import { NavLink } from '@modern-js/runtime/router';

export function Logo({ hideOnMobile }: { hideOnMobile?: boolean }) {
  const titleClassName = hideOnMobile
    ? 'font-bold hidden md:block'
    : 'font-bold';
  return (
    <NavLink
      to={'/'}
      className="flex items-center gap-2 transition-all duration-300 hover:!opacity-100"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded bg-[#6366F1] text-white">
        <IconHeadphones className="h-4 w-4" fill="currentColor" />
      </span>
      <strong className={`${titleClassName} text-dark dark:text-white`}>Helpdesk</strong>
    </NavLink>
  );
}
