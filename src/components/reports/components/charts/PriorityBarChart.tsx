import type { PriorityBreakdownDto } from '@/types';
import type { FC } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PriorityBarChartProps {
  data: PriorityBreakdownDto[];
}

const PRIORITY_COLORS: Record<string, string> = {
  None: '#8c8f97',
  Low: '#1868db',
  Normal: '#6a9a23',
  High: '#ff7f00',
  Critical: '#f15050',
};

export const PriorityBarChart: FC<PriorityBarChartProps> = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) return null;

  const chartData = data.map(item => ({
    name: item.name,
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
        <Bar dataKey="count" fill="#1868db" name="Ticket Count" />
      </BarChart>
    </ResponsiveContainer>
  );
};
