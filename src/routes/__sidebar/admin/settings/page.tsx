import { getAppConfig } from '@/state/config';
import { BaseCard } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { PageBody, PageHeader } from '@brainforgeau/components/page';
import { Card, CardContent } from '@heroui/react';
import { NavLink } from '@modern-js/runtime/router';

type SettingCardProps = {
  title: string;
  description: string;
  icon: string;
  href: string;
  isComingSoon?: boolean;
  isExternal?: boolean;
};

function SettingCard({
  title,
  description,
  icon,
  href,
  isComingSoon,
  isExternal,
}: SettingCardProps) {
  const content = (
    <BaseCard
      className={`transition-all ${isComingSoon ? 'opacity-60' : 'hover:border-primary hover:shadow-md'}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0">
          <Icon name={icon} className="text-primary h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <h3 className="text-base font-semibold">{title}</h3>
            {isExternal && (
              <Icon
                name="arrow-top-right-on-square"
                className="text-default-400 h-3.5 w-3.5"
              />
            )}
          </div>
          <p className="text-default-500 text-sm">{description}</p>
          {isComingSoon && (
            <span className="text-warning mt-2 inline-block text-xs">
              Coming soon
            </span>
          )}
        </div>
      </div>
    </BaseCard>
  );

  if (isComingSoon) {
    return content;
  }

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
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
      ],
    },
    {
      title: 'Getting help',
      items: [
        {
          title: 'User manual',
          description:
            'Comprehensive documentation and guides — opens in a new tab',
          icon: 'book-open',
          href: userManualUrl,
          isExternal: true,
        },
        {
          title: 'API documentation',
          description:
            'Developer documentation and OpenAPI reference — opens in a new tab',
          icon: 'code-bracket',
          href: apiDocsUrl,
          isExternal: true,
        },
      ],
    },
  ];

  return (
    <PageBody>
      <PageHeader title="Administration" breadcrumbsKey="admin.settings">
        <PageHeader.Meta>
          Manage your helpdesk configuration and settings
        </PageHeader.Meta>
      </PageHeader>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-default-700 mb-4 text-lg font-semibold">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <SettingCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageBody>
  );
}

export default AdministrationPage;
