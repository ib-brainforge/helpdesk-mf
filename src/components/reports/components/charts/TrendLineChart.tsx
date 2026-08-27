import type { DynamicsDataPointDto } from '@/types';
import { formatDateTimeAsDate } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import type { FC } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_COLORS,
  CHART_GRID,
  axisProps,
  gradientStops,
  tooltipProps,
} from './chartTheme';

interface TrendLineChartProps {
  data: DynamicsDataPointDto[];
}

/**
 * Created / Closed / Open over time.
 *
 * These are three INDEPENDENT series drawn on one axis — they are not parts of
 * a whole and do not sum to anything. That is the risk with filled areas: a
 * heavy wash makes overlapping series look stacked, and a reader takes the top
 * edge for a running total. Three things keep that from happening here:
 *
 *   - The fills are gradients topping out at 0.22 and fading to nothing at the
 *     baseline, so they read as shading under a line rather than as mass.
 *   - The strokes stay 2px and fully opaque, so the line is the thing you read
 *     a value off; the fill only adds depth.
 *   - Areas are NOT stacked (no stackId) and the series cross each other
 *     visibly, which is the visual cue that they are independent.
 *
 * If these ever need to be compared precisely rather than scanned, the honest
 * form is small multiples — one filled area per series sharing an x-axis —
 * since overlapping fills always cost some occlusion.
 */
export const TrendLineChart: FC<TrendLineChartProps> = ({ data }) => {
  const timezone = useTimezone();
  if (!Array.isArray(data) || data.length === 0) return null;

  const chartData = data.map(item => ({
    date: formatDateTimeAsDate(item.periodStart, { timezone }),
    created: item.createdCount,
    closed: item.closedCount,
    open: item.netOpen,
  }));

  const series = [
    { key: 'created', name: 'Created', color: CHART_COLORS.blue, fill: 'blue' },
    { key: 'closed', name: 'Closed', color: CHART_COLORS.green, fill: 'green' },
    { key: 'open', name: 'Open', color: CHART_COLORS.yellow, fill: 'yellow' },
  ] as const;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0 }}>
        <defs>{gradientStops()}</defs>
        {/* Horizontal rules only. Vertical lines add nothing here — the x-axis
            is already labelled per point — and doubled the grid's weight. */}
        <CartesianGrid
          stroke={CHART_GRID}
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} width={40} />
        <Tooltip {...tooltipProps} />
        <Legend
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        {series.map(s => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#chart-fill-${s.fill})`}
            // A dot per point is noise at this density; the active dot on hover
            // is what confirms which point the tooltip is reading.
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};
