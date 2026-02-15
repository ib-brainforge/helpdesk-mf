import { Helmet } from '@modern-js/runtime/head';
import { NavLink } from '@modern-js/runtime/router';
import { Icon } from '@brainforgeau/components/base';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardBody } from '@heroui/react';

type ReportCardProps = {
  title: string;
  description: string;
  icon: string;
  href: string;
  isComingSoon?: boolean;
};

function ReportCard({ title, description, icon, href, isComingSoon }: ReportCardProps) {
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
        },
        {
          title: 'Custom reports',
          description: 'Build custom reports with flexible filters',
          icon: 'adjustments-horizontal',
          href: '/reports',
        },
        {
          title: 'Response speed',
          description: 'First response and resolution time metrics',
          icon: 'clock',
          href: '/reports',
        },
        {
          title: 'Overdue tickets',
          description: 'Tickets past their due date or SLA',
          icon: 'exclamation-circle',
          href: '/reports/overdue',
          isComingSoon: true,
        },
        {
          title: 'Tickets by category',
          description: 'Distribution of tickets across categories',
          icon: 'folder-open',
          href: '/reports/by-category',
          isComingSoon: true,
        },
        {
          title: 'Tickets by priority',
          description: 'Breakdown by priority levels',
          icon: 'flag',
          href: '/reports/by-priority',
          isComingSoon: true,
        },
        {
          title: 'Tickets by status',
          description: 'Current status distribution',
          icon: 'bars-3-bottom-left',
          href: '/reports/by-status',
          isComingSoon: true,
        },
        {
          title: 'SLA compliance',
          description: 'Track SLA adherence and breaches',
          icon: 'shield-check',
          href: '/reports/sla',
          isComingSoon: true,
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
        },
        {
          title: 'Companies statistics',
          description: 'Ticket volume and metrics by company',
          icon: 'building-office',
          href: '/reports/companies',
          isComingSoon: true,
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
          isComingSoon: true,
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
          isComingSoon: true,
        },
        {
          title: 'Audit Log',
          description: 'Complete activity and change history',
          icon: 'clipboard-document-list',
          href: '/reports/audit',
          isComingSoon: true,
        },
        {
          title: 'Assets',
          description: 'Asset inventory and allocation reports',
          icon: 'server-stack',
          href: '/reports/assets',
          isComingSoon: true,
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
            <h2 className="text-lg font-semibold mb-4 text-default-700">{section.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
