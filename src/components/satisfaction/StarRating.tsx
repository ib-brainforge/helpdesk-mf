import { type FC, useState } from 'react';
import { Icon } from '@brainforgeau/components';

// REVIEW: Using controlled component pattern for star rating
interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StarRating: FC<StarRatingProps> = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || value;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => handleClick(rating)}
          onMouseEnter={() => handleMouseEnter(rating)}
          onMouseLeave={handleMouseLeave}
          disabled={readonly}
          className={`${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } transition-transform`}
          aria-label={`Rate ${rating} stars`}
        >
          <Icon
            name="star"
            className={`${sizeClasses[size]} ${
              rating <= displayRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};
