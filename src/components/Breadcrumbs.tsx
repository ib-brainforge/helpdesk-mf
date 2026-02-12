import { NavLink } from '@modern-js/runtime/router';
import { BaseBreadcrumbs as BaseBreadcrumbsComponent } from '@brainforgeau/components/breadcrumbs';
import type { ReactNode, ComponentProps } from 'react';

export type BaseBreadcrumbItem = {
  label: string;
  href: string;
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

export const Breadcrumbs = (props: Omit<BaseBreadcrumbsProps, 'renderLink'>) => {
  const componentProps = {
    ...props,
    renderLink: ({ item, className, children }: BreadcrumbLinkRenderProps) => (
      <NavLink to={item.href} className={className}>
        {children}
      </NavLink>
    ),
  } as any;

  return <BaseBreadcrumbsComponent {...componentProps} />;
};
