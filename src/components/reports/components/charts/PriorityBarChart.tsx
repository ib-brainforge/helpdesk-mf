import type { FC } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PriorityBreakdownDto } from '@/types';

interface PriorityBarChartProps {
  data: PriorityBreakdownDto[];
}

const PRIORITY_COLORS: Record<string, string> = {
  None: '#9ca3af', // gray
  Low: '#3b82f6', // blue
  Normal: '#10b981', // green
  High: '#f59e0b', // amber
  Critical: '#ef4444', // red
};

export const PriorityBarChart: FC<PriorityBarChartProps> = ({ data }) => {
  const chartData = data.map(item => ({
    name: item.priorityName,
    count: item.count,
    percentage: item.percentage,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === 'count' ? `${value} tickets` : `${value.toFixed(1)}%`
          }
        />
        <Legend />
        <Bar dataKey="count" fill="#3b82f6" name="Ticket Count" />
      </BarChart>
    </ResponsiveContainer>
  );
};
