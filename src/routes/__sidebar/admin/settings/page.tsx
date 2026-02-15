import { Helmet } from '@modern-js/runtime/head';
import { NavLink } from '@modern-js/runtime/router';
import { Icon } from '@brainforgeau/components/base';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardBody } from '@heroui/react';

type SettingCardProps = {
  title: string;
  description: string;
  icon: string;
  href: string;
  isComingSoon?: boolean;
};

function SettingCard({ title, description, icon, href, isComingSoon }: SettingCardProps) {
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
            <h3 className="text-base font-semibold mb-1">{title}</h3>
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
  // REVIEW: Links map to existing pages where available, placeholders for not-yet-implemented pages
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
          isComingSoon: true,
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
          isComingSoon: true,
        },
        {
          title: 'Custom priorities',
          description: 'Create and manage custom priority levels',
          icon: 'exclamation-triangle',
          href: '/configuration/custom-priorities',
          isComingSoon: true,
        },
        {
          title: 'Canned responses',
          description: 'Pre-written responses for common questions',
          icon: 'document-text',
          href: '/configuration/canned-responses',
          isComingSoon: true,
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
          href: '/configuration/automation',
        },
        {
          title: 'AI features',
          description: 'Configure AI-powered assistance and suggestions',
          icon: 'sparkles',
          href: '/configuration/ai-features',
          isComingSoon: true,
        },
        {
          title: 'Live Chat widget',
          description: 'Embed live chat on your website',
          icon: 'chat-bubble-left-right',
          href: '/configuration/live-chat',
          isComingSoon: true,
        },
        {
          title: 'Integration',
          description: 'Connect with third-party tools and services',
          icon: 'puzzle-piece',
          href: '/configuration/integrations',
          isComingSoon: true,
        },
        {
          title: 'Import and Export',
          description: 'Bulk import/export tickets and data',
          icon: 'arrow-down-tray',
          href: '/configuration/import-export',
          isComingSoon: true,
        },
        {
          title: 'Billing',
          description: 'Manage subscription and billing settings',
          icon: 'credit-card',
          href: '/configuration/billing',
          isComingSoon: true,
        },
      ],
    },
    {
      title: 'Getting help',
      items: [
        {
          title: 'User manual',
          description: 'Comprehensive documentation and guides',
          icon: 'book-open',
          href: '/help/manual',
          isComingSoon: true,
        },
        {
          title: 'API',
          description: 'Developer documentation and API reference',
          icon: 'code-bracket',
          href: '/help/api',
          isComingSoon: true,
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
