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
import type { CategoryBreakdownDto } from '@/types';

interface CategoryBarChartProps {
  data: CategoryBreakdownDto[];
}

export const CategoryBarChart: FC<CategoryBarChartProps> = ({ data }) => {
  // Sort by count descending and take top 10
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(item => ({
      name: item.categoryName,
      count: item.count,
      percentage: item.percentage,
    }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={sortedData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" width={150} />
        <Tooltip formatter={(value: number) => `${value} tickets`} />
        <Legend />
        <Bar dataKey="count" fill="#8b5cf6" name="Ticket Count" />
      </BarChart>
    </ResponsiveContainer>
  );
};
