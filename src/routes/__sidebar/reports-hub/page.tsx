import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BaseCard } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { Card, CardContent } from '@heroui/react';
import { Helmet } from '@modern-js/runtime/head';
import { NavLink } from '@modern-js/runtime/router';

type ReportCardProps = {
  title: string;
  description: string;
  icon: string;
  href: string;
  isComingSoon?: boolean;
};

function ReportCard({
  title,
  description,
  icon,
  href,
  isComingSoon,
}: ReportCardProps) {
  const content = (
    <BaseCard
      className={`transition-all ${isComingSoon ? 'opacity-60' : 'hover:border-primary hover:shadow-md'}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0">
          <Icon name={icon} className="text-primary h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-base font-semibold">{title}</h3>
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

  return (
    <NavLink to={href} className="block">
      {content}
    </NavLink>
  );
}

type ReportSection = {
  title: string;
  items: ReportCardProps[];
};

function ReportsHubPage() {
  // REVIEW: Links to existing reports where available, placeholders for not-yet-implemented reports
  const sections: ReportSection[] = [
    {
      title: 'Tickets',
      items: [
        {
          title: 'Summary',
          description: 'Overview of ticket metrics with charts and trends',
          icon: 'chart-pie',
          href: '/reports/summary',
        },
        {
          title: 'Tickets per day',
          description: 'Daily ticket volume and trends',
          icon: 'chart-bar',
          href: '/reports',
          isComingSoon: true,
        },
        {
          title: 'Custom reports',
          description: 'Build custom reports with flexible filters',
          icon: 'adjustments-horizontal',
          href: '/reports',
          isComingSoon: true,
        },
        {
          title: 'Response speed',
          description: 'First response and resolution time metrics',
          icon: 'clock',
          href: '/reports',
          isComingSoon: true,
        },
        {
          title: 'Overdue tickets',
          description: 'Tickets past their due date or SLA',
          icon: 'exclamation-circle',
          href: '/reports/overdue',
        },
        {
          title: 'Tickets by category',
          description: 'Distribution of tickets across categories',
          icon: 'folder-open',
          href: '/reports/by-category',
        },
        {
          title: 'Tickets by priority',
          description: 'Breakdown by priority levels',
          icon: 'flag',
          href: '/reports/by-priority',
        },
        {
          title: 'Tickets by status',
          description: 'Current status distribution',
          icon: 'bars-3-bottom-left',
          href: '/reports/by-status',
        },
        {
          title: 'SLA compliance',
          description: 'Track SLA adherence and breaches',
          icon: 'shield-check',
          href: '/reports/sla',
        },
      ],
    },
    {
      title: 'Users',
      items: [
        {
          title: 'User statistics',
          description: 'Agent performance and activity metrics',
          icon: 'user-circle',
          href: '/reports',
          isComingSoon: true,
        },
        {
          title: 'Companies statistics',
          description: 'Ticket volume and metrics by company',
          icon: 'building-office',
          href: '/reports/companies',
        },
        {
          title: 'Customer satisfaction',
          description: 'CSAT scores and feedback analysis',
          icon: 'star',
          href: '/reports/satisfaction',
        },
        {
          title: 'Agent utilization',
          description: 'Workload distribution and capacity',
          icon: 'chart-bar-square',
          href: '/reports/utilization',
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          title: 'Deleted tickets',
          description: 'Audit trail of deleted tickets',
          icon: 'trash',
          href: '/reports/deleted',
        },
        {
          title: 'Audit Log',
          description: 'Complete activity and change history',
          icon: 'clipboard-document-list',
          href: '/reports/audit',
        },
        {
          title: 'Assets',
          description: 'Asset inventory and allocation reports',
          icon: 'server-stack',
          href: '/reports/assets',
        },
      ],
    },
  ];

  return (
    <>
      <Helmet>
        <title>Reports - Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports-hub', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-default-500 mt-1">
          Analyze ticket metrics, team performance, and customer satisfaction
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-default-700 mb-4 text-lg font-semibold">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <ReportCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default ReportsHubPage;
