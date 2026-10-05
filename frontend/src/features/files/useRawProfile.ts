import { useEffect, useRef, useState } from 'react';
import { request } from '../../lib/api';
export function useRawProfile(
  nodeIndex: number | undefined,
  path: string,
  open: boolean,
) {
  const [raw, setRaw] = useState('');
  const [rawBusy, setRawBusy] = useState(false);
  const rawSequence = useRef(0);

  useEffect(() => {
    if (!open || nodeIndex === undefined) return;
    const sequence = ++rawSequence.current;
    setRawBusy(true);
    void request(`/api/admin/preview/profiles/raw/${nodeIndex}`, 'POST')
      .then((value) => {
        if (sequence === rawSequence.current)
          setRaw(JSON.stringify(value, null, 2));
      })
      .catch((error) => {
        if (sequence === rawSequence.current) setRaw(error.message);
      })
      .finally(() => {
        if (sequence === rawSequence.current) setRawBusy(false);
      });
    return () => {
      rawSequence.current++;
    };
  }, [open, path, nodeIndex]);

  return { raw, rawBusy };
}
