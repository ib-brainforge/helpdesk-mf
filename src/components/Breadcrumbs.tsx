import { BaseBreadcrumbs as BaseBreadcrumbsComponent } from '@brainforgeau/components/breadcrumbs';
import { NavLink } from '@modern-js/runtime/router';
import type { ComponentProps, ReactNode } from 'react';

export type BaseBreadcrumbItem = {
  label: string;
  href?: string;
  isCurrent?: boolean;
};

type BreadcrumbLinkRenderProps = {
  item: BaseBreadcrumbItem;
  className: string;
  children: ReactNode;
};

type BaseBreadcrumbsProps = ComponentProps<typeof BaseBreadcrumbsComponent> & {
  renderLink?: (props: BreadcrumbLinkRenderProps) => ReactNode;
};

/**
 * How a breadcrumb renders: a link when it has somewhere to go, plain text
 * when it does not.
 *
 * The breadcrumb component calls this for every crumb except the current
 * page, whether or not it has an href. Rendering a NavLink regardless sent a
 * crumb with no destination, such as Configuration (a menu group with no page
 * of its own), to the current page, and it looked and behaved like a link:
 * pointer cursor, hover colour, a click that went nowhere. Without an href it
 * is now a span that keeps the crumb's colour but takes no pointer events, so
 * nothing changes on hover and nothing suggests it can be clicked.
 */
export const renderBreadcrumbLink = ({
  item,
  className,
  children,
}: BreadcrumbLinkRenderProps) =>
  item.href ? (
    <NavLink to={item.href} className={className}>
      {children}
    </NavLink>
  ) : (
    <span className={`${className ?? ''} pointer-events-none cursor-default`}>
      {children}
    </span>
  );

export const Breadcrumbs = (
  props: Omit<BaseBreadcrumbsProps, 'renderLink'>,
) => {
  const componentProps = {
    ...props,
    renderLink: renderBreadcrumbLink,
  } as any;

  return <BaseBreadcrumbsComponent {...componentProps} />;
};
