import type { FC } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// REVIEW: Following existing chart pattern with Recharts
interface CSATRatingDistributionChartProps {
  distribution: {
    rating1Count: number;
    rating2Count: number;
    rating3Count: number;
    rating4Count: number;
    rating5Count: number;
  };
}

export const CSATRatingDistributionChart: FC<CSATRatingDistributionChartProps> = ({
  distribution,
}) => {
  const chartData = [
    { rating: '1 Star', count: distribution.rating1Count },
    { rating: '2 Stars', count: distribution.rating2Count },
    { rating: '3 Stars', count: distribution.rating3Count },
    { rating: '4 Stars', count: distribution.rating4Count },
    { rating: '5 Stars', count: distribution.rating5Count },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="rating" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#f59e0b" name="Number of Ratings" />
      </BarChart>
    </ResponsiveContainer>
  );
};
