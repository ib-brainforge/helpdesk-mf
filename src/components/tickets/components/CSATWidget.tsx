import type { FC } from 'react';
import { Icon } from '@brainforgeau/components';
import { Box } from '@brainforgeau/components/base';
import { StarRating } from '@/components/satisfaction/StarRating';
import { useSatisfactionRatingByTicket } from '@/hooks/useSatisfaction';
import { TicketStatus } from '@/types/ticket';

// REVIEW: Widget component for ticket detail page - shows CSAT if exists
interface CSATWidgetProps {
  ticketId: string;
  ticketStatus: TicketStatus;
}

export const CSATWidget: FC<CSATWidgetProps> = ({ ticketId, ticketStatus }) => {
  const { data: rating, isLoading } = useSatisfactionRatingByTicket(ticketId);

  // Don't show widget for non-closed tickets
  if (ticketStatus !== TicketStatus.Closed) {
    return null;
  }

  if (isLoading) {
    return (
      <Box title="Customer Satisfaction">
        <div className="flex items-center gap-2">
          <Icon name="star" className="h-5 w-5 text-gray-400 animate-pulse" />
          <p className="text-sm text-gray-500">Loading satisfaction rating...</p>
        </div>
      </Box>
    );
  }

  if (!rating) {
    return (
      <Box title="Customer Satisfaction">
        <div className="flex items-center gap-2">
          <Icon name="star" className="h-5 w-5 text-gray-400" />
          <p className="text-sm text-gray-600">No customer satisfaction rating yet</p>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Customer will receive a survey email after ticket closure.
        </p>
      </Box>
    );
  }

  return (
    <Box title="Customer Satisfaction">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-600">
              Rated on {new Date(rating.ratedAt).toLocaleDateString()}
            </p>
          </div>
          <StarRating value={rating.rating} readonly size="md" />
        </div>

        {rating.comment && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm font-medium mb-1">Customer Feedback:</p>
            <p className="text-sm text-gray-700 italic">"{rating.comment}"</p>
          </div>
        )}

        {rating.ratedByUserName && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Icon name="user" className="h-3 w-3" />
            <span>Rated by: {rating.ratedByUserName}</span>
          </div>
        )}
      </div>
    </Box>
  );
};
