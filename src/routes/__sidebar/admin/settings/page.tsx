import { Helmet } from '@modern-js/runtime/head';
import { NavLink } from '@modern-js/runtime/router';
import { Icon } from '@brainforgeau/components/base';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardBody } from '@heroui/react';
import { getAppConfig } from '@/state/config';

type SettingCardProps = {
  title: string;
  description: string;
  icon: string;
  href: string;
  isComingSoon?: boolean;
  isExternal?: boolean;
};

function SettingCard({ title, description, icon, href, isComingSoon, isExternal }: SettingCardProps) {
  const content = (
    <Card
      className={`transition-all ${isComingSoon ? 'opacity-60' : 'hover:shadow-md hover:border-primary'}`}
      isPressable={!isComingSoon}
    >
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <Icon name={icon} className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="text-base font-semibold">{title}</h3>
              {isExternal && (
                <Icon name="arrow-top-right-on-square" className="h-3.5 w-3.5 text-default-400" />
              )}
            </div>
            <p className="text-sm text-default-500">{description}</p>
            {isComingSoon && (
              <span className="inline-block mt-2 text-xs text-warning">Coming soon</span>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );

  if (isComingSoon) {
    return content;
  }

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return (
    <NavLink to={href} className="block">
      {content}
    </NavLink>
  );
}

type SettingSection = {
  title: string;
  items: SettingCardProps[];
};

function AdministrationPage() {
  const config = getAppConfig();
  // REVIEW: userManualUrl and apiDocsUrl can be overridden per environment via runtime config
  const userManualUrl: string =
    (config as any).userManualUrl ?? 'https://docs.brainforge.au/helpdesk';
  const apiDocsUrl: string =
    (config as any).apiDocsUrl ?? `${config?.api?.baseUrl ?? ''}/swagger`;

  const sections: SettingSection[] = [
    {
      title: 'General settings',
      items: [
        {
          title: 'General settings',
          description: 'Configure basic helpdesk settings and preferences',
          icon: 'cog-6-tooth',
          href: '/configuration/app-settings',
        },
        {
          title: 'Email settings',
          description: 'Configure email servers and notifications',
          icon: 'envelope',
          href: '/configuration/email',
        },
        {
          title: 'Users',
          description: 'Manage users, roles, and permissions',
          icon: 'users',
          href: '/admin/users',
        },
      ],
    },
    {
      title: 'Tickets',
      items: [
        {
          title: 'Ticket categories',
          description: 'Organize tickets into categories and subcategories',
          icon: 'folder',
          href: '/configuration/categories',
        },
        {
          title: 'Custom fields',
          description: 'Add custom fields to tickets, users, and companies',
          icon: 'variable',
          href: '/configuration/custom-fields',
        },
        {
          title: 'Custom statuses',
          description: 'Define custom ticket statuses beyond open/closed',
          icon: 'flag',
          href: '/configuration/custom-statuses',
        },
        {
          title: 'Custom priorities',
          description: 'Create and manage custom priority levels',
          icon: 'exclamation-triangle',
          href: '/configuration/custom-priorities',
        },
        {
          title: 'Canned responses',
          description: 'Pre-written responses for common questions',
          icon: 'document-text',
          href: '/configuration/canned-responses',
        },
      ],
    },
    {
      title: 'Advanced',
      items: [
        {
          title: 'Automation rules',
          description: 'Automate ticket workflows with conditional rules',
          icon: 'bolt',
          href: '/configuration/automations',
        },
        {
          title: 'AI features',
          description: 'Configure AI-powered assistance and suggestions',
          icon: 'sparkles',
          href: '/configuration/ai-features',
        },
        {
          title: 'Live Chat widget',
          description: 'Embed live chat on your website',
          icon: 'chat-bubble-left-right',
          href: '/configuration/live-chat',
        },
        {
          title: 'Integration',
          description: 'Connect with third-party tools and services',
          icon: 'puzzle-piece',
          href: '/configuration/integrations',
        },
        {
          title: 'Import and Export',
          description: 'Bulk import/export tickets and data',
          icon: 'arrow-down-tray',
          href: '/configuration/import-export',
        },
        {
          title: 'Billing',
          description: 'Manage subscription and billing settings',
          icon: 'credit-card',
          href: '/configuration/billing',
        },
      ],
    },
    {
      title: 'Getting help',
      items: [
        {
          title: 'User manual',
          description: 'Comprehensive documentation and guides — opens in a new tab',
          icon: 'book-open',
          href: userManualUrl,
          isExternal: true,
        },
        {
          title: 'API documentation',
          description: 'Developer documentation and OpenAPI reference — opens in a new tab',
          icon: 'code-bracket',
          href: apiDocsUrl,
          isExternal: true,
        },
      ],
    },
  ];

  return (
    <>
      <Helmet>
        <title>Administration - Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Administration', href: '/admin/settings', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Administration</h1>
        <p className="text-default-500 mt-1">Manage your helpdesk configuration and settings</p>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-semibold mb-4 text-default-700">{section.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item) => (
                <SettingCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default AdministrationPage;
