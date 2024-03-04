import { MutableRefObject, useEffect, useRef } from 'react';

type ReturnedValueType = MutableRefObject<HTMLDivElement | null>;

export const useOutsideClick = (callback: () => void): ReturnedValueType => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [ref]);

  return ref;
};
