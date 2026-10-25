import { useEffect, useState } from 'react';

/**
 * The value, once it has stopped changing for `ms`. The one debounce for
 * search boxes and live previews, so each does not keep its own copy.
 */
export const useDebounced = <T>(value: T, ms: number): T => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
};
