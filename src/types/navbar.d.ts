declare module '@brainforgeau/navbar/Navbar' {
  import type { FC, HTMLAttributes, ReactNode } from 'react';

  export interface NavbarConfig {
    identityBaseUrl?: string;
    notificationHubUrl?: string;
    notificationApiUrl?: string;
    app?: string;
    enableWhitelabel?: boolean;
    aiChatProductId?: string;
    hideAppSwitcher?: boolean;
    hideContextSwitcher?: boolean;
  }

  export interface NavbarProps {
    logoComponent: ReactNode;
    config: NavbarConfig;
    onExtend?: () => void;
  }

  export const TopNavbar: FC<NavbarProps & HTMLAttributes<HTMLDivElement>>;
}

declare module '@brainforgeau/navbar' {
  export { TopNavbar, NavbarConfig, NavbarProps } from '@brainforgeau/navbar/Navbar';
}
