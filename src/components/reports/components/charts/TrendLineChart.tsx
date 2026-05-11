import type { DynamicsDataPointDto } from '@/types';
import { formatDateTimeAsDate } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import type { FC } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface TrendLineChartProps {
  data: DynamicsDataPointDto[];
}

export const TrendLineChart: FC<TrendLineChartProps> = ({ data }) => {
  const timezone = useTimezone();
  if (!Array.isArray(data) || data.length === 0) return null;

  const chartData = data.map(item => ({
    date: formatDateTimeAsDate(item.periodStart, { timezone }),
    created: item.createdCount,
    closed: item.closedCount,
    open: item.netOpen,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="created"
          stroke="#3b82f6"
          name="Created"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="closed"
          stroke="#10b981"
          name="Closed"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="open"
          stroke="#f59e0b"
          name="Open"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
