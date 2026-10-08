import type { KpiCardsDto } from '@/api/local/kpi';
import { SummaryCard, type SummaryCardVariant } from '@/components/shared';
import { formatDuration } from '@/components/shared/deadline';
import { NavLink } from '@modern-js/runtime/router';
import type { FC, ReactNode } from 'react';
import { formatPct, formatScore } from './kpiFormat';

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const minutes = (m: number | null | undefined) =>
  m === null || m === undefined ? '–' : formatDuration(m);

/**
 * "▲ Was 94.2% in August". The arrow shows which way the figure moved; the
 * colour says whether that is good, because for half of these down is better.
 */
const Comparison: FC<{
  current: number | null | undefined;
  previous: number | null | undefined;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
  monthName: string;
}> = ({ current, previous, format, lowerIsBetter, monthName }) => {
  if (previous === null || previous === undefined) {
    return <span className="text-gray">No figures for {monthName}</span>;
  }
  if (current === null || current === undefined || current === previous) {
    return (
      <span className="text-gray">
        Was {format(previous)} in {monthName}
      </span>
    );
  }
  const up = current > previous;
  const good = lowerIsBetter ? !up : up;
  return (
    <span className={good ? 'text-[#4c7a0f]' : 'text-[#ae2e24]'}>
      <span aria-hidden>{up ? '▲' : '▼'}</span> Was {format(previous)} in{' '}
      {monthName}
    </span>
  );
};

interface CardSpec {
  key: string;
  title: string;
  value: string | number;
  subtitle: ReactNode;
  footer: ReactNode;
  icon: string;
  variant: SummaryCardVariant;
  accent: string;
  href?: string;
}

interface KpiCardsProps {
  cards?: KpiCardsDto;
  previous?: KpiCardsDto | null;
  monthName: string;
  isLoading?: boolean;
}

/** The six KPI cards, in their own grid: DashboardPage's is fixed at four. */
export const KpiCards: FC<KpiCardsProps> = ({
  cards: c,
  previous: p,
  monthName,
  isLoading,
}) => {
  const specs: CardSpec[] = [
    {
      key: 'deadline',
      title: 'Deadline met',
      value: formatPct(c?.deadlineMetPct),
      subtitle: c ? `Target ${c.deadlineTargetPct}%` : '',
      footer: (
        <Comparison
          current={c?.deadlineMetPct}
          previous={p?.deadlineMetPct}
          format={formatPct}
          monthName={monthName}
        />
      ),
      icon: 'clock',
      variant: 'danger',
      accent: 'bg-[#ae2e24]',
    },
    {
      key: 'reply',
      title: 'Time to first reply',
      value: minutes(c?.avgFirstReplyMinutes),
      subtitle: c
        ? `Average. ${plural(c.lateReplies, 'reply', 'replies')} late`
        : '',
      footer: (
        <Comparison
          current={c?.avgFirstReplyMinutes}
          previous={p?.avgFirstReplyMinutes}
          format={formatDuration}
          lowerIsBetter
          monthName={monthName}
        />
      ),
      icon: 'chat',
      variant: 'info',
      accent: 'bg-[#1868db]',
    },
    {
      key: 'fix',
      title: 'Time to fix',
      value: minutes(c?.avgFixMinutes),
      subtitle: c ? `Average. ${plural(c.lateFixes, 'fix', 'fixes')} late` : '',
      footer: (
        <Comparison
          current={c?.avgFixMinutes}
          previous={p?.avgFixMinutes}
          format={formatDuration}
          lowerIsBetter
          monthName={monthName}
        />
      ),
      icon: 'check-o',
      variant: 'info',
      accent: 'bg-[#1868db]',
    },
    {
      key: 'open',
      title: 'Open tickets',
      value: c?.openTickets ?? '–',
      subtitle: c ? (
        <span className={c.overdueNow > 0 ? 'text-[#ae2e24]' : undefined}>
          {c.overdueNow} overdue now
        </span>
      ) : (
        ''
      ),
      footer: (
        <Comparison
          current={c?.openTickets}
          previous={p?.openTickets}
          format={String}
          lowerIsBetter
          monthName={monthName}
        />
      ),
      icon: 'text',
      variant: 'warning',
      accent: 'bg-[#7f5f01]',
    },
    {
      key: 'cameBack',
      title: 'Came back',
      value: formatPct(c?.cameBackPct),
      subtitle: c
        ? `${c.cameBackCount} of ${c.closedCount} closed tickets`
        : '',
      footer: (
        <Comparison
          current={c?.cameBackPct}
          previous={p?.cameBackPct}
          format={formatPct}
          lowerIsBetter
          monthName={monthName}
        />
      ),
      icon: 'refresh',
      variant: 'default',
      accent: 'bg-[#62748e]',
    },
    {
      key: 'csat',
      title: 'Client satisfaction',
      value:
        c?.csatAverage === null || c?.csatAverage === undefined
          ? '–'
          : `${formatScore(c.csatAverage)} / 5`,
      subtitle: c ? `From ${plural(c.csatSurveys, 'survey', 'surveys')}` : '',
      footer: (
        <Comparison
          current={c?.csatAverage}
          previous={p?.csatAverage}
          format={formatScore}
          monthName={monthName}
        />
      ),
      icon: 'smile',
      variant: 'success',
      accent: 'bg-[#6a9a23]',
      // The survey answers themselves are on the satisfaction report.
      href: '/reports/satisfaction',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {specs.map(s => {
        const { key, href, accent, ...card } = s;
        return href ? (
          <NavLink
            key={key}
            to={href}
            title="Open the satisfaction report"
            className="block rounded-md transition-shadow hover:shadow-md print:pointer-events-none"
          >
            <SummaryCard
              {...card}
              accentClassName={accent}
              isLoading={isLoading}
            />
          </NavLink>
        ) : (
          <div key={key}>
            <SummaryCard
              {...card}
              accentClassName={accent}
              isLoading={isLoading}
            />
          </div>
        );
      })}
    </div>
  );
};
