import { BaseInput } from '@brainforgeau/components';
import { type FC, useEffect, useState } from 'react';
import { formatMinutes, parseDuration } from './deadline/deadlineText';

interface DurationInputProps {
  label: string;
  /** Minutes; NaN while what was typed cannot be read. */
  value: number;
  onChange: (minutes: number) => void;
  onBlur?: () => void;
  /** A rule the form checks (shown under the field). */
  error?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * The one way a duration is typed in Helpdesk: a single field that takes
 * "30 min", "4 h", "1h 30m" or a bare number of minutes, and shows the value
 * back as "4 h" once it is read. Something it cannot read is said under the
 * field straight away, without waiting for Save.
 */
export const DurationInput: FC<DurationInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  error,
  className,
  autoFocus,
}) => {
  const shown = Number.isFinite(value) ? formatMinutes(value) : '';
  const [text, setText] = useState(shown);
  const [typing, setTyping] = useState(false);
  // Follows the value from outside (Reset, a loaded policy) unless being typed in.
  useEffect(() => {
    if (!typing) setText(shown);
  }, [shown, typing]);

  const parsed = parseDuration(text);
  const unreadable = text.trim() !== '' && parsed === null;
  const message = unreadable ? 'Type a time like 30 min or 4 h' : error;

  return (
    <BaseInput
      aria-label={label}
      size="sm"
      className={className ?? 'w-36'}
      value={text}
      autoFocus={autoFocus}
      isInvalid={Boolean(message)}
      errorMessage={message}
      onFocus={() => setTyping(true)}
      onChange={e => {
        setText(e.target.value);
        const next = parseDuration(e.target.value);
        onChange(next === null ? Number.NaN : next);
      }}
      onBlur={() => {
        setTyping(false);
        if (parsed !== null) setText(formatMinutes(parsed));
        onBlur?.();
      }}
    />
  );
};
