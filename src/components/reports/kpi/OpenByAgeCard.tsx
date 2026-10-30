import type { KpiReportDto } from '@/api/local/kpi';
import { NavLink } from '@modern-js/runtime/router';
import type { FC } from 'react';
import { KpiPanel } from './KpiPanel';

interface OpenByAgeCardProps {
  openByAge: KpiReportDto['openByAge'];
  totalOpen: number;
}

const BUCKETS = [
  { key: 'under2Days', label: 'Under 2 days', bar: 'bg-[#1868db]' },
  { key: 'days2To7', label: '2 to 7 days', bar: 'bg-[#1868db]' },
  { key: 'days8To30', label: '8 to 30 days', bar: 'bg-[#e17100]' },
  { key: 'over30Days', label: 'Over 30 days', bar: 'bg-[#ae2e24]' },
] as const;

/** Open tickets in four age buckets, as plain bars, plus the oldest one. */
export const OpenByAgeCard: FC<OpenByAgeCardProps> = ({
  openByAge,
  totalOpen,
}) => {
  const max = Math.max(1, ...BUCKETS.map(b => openByAge[b.key]));
  const oldest = openByAge.oldest;

  return (
    <KpiPanel title="Open tickets by age" aside={`${totalOpen} open tickets`}>
      <div className="space-y-3 px-5 py-4">
        {BUCKETS.map(b => {
          const n = openByAge[b.key];
          return (
            <div
              key={b.key}
              className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-sm"
            >
              <span className="text-default-600">{b.label}</span>
              <span className="bg-default-100 h-2.5 overflow-hidden rounded-sm">
                <span
                  className={`block h-full ${b.bar}`}
                  style={{ width: `${(n / max) * 100}%` }}
                />
              </span>
              <span className="text-right font-semibold tabular-nums">{n}</span>
            </div>
          );
        })}
      </div>
      {oldest && (
        <div className="border-default-200 text-default-600 flex items-center justify-between gap-3 border-t px-5 py-2.5 text-xs">
          <span>Oldest: {oldest.ageDays} days</span>
          <NavLink
            to={`/tickets/${oldest.ticketId}`}
            className="text-primary hover:underline print:hidden"
          >
            View
          </NavLink>
        </div>
      )}
    </KpiPanel>
  );
};
