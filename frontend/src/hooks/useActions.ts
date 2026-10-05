import { useCallback, useEffect, useState } from 'react';
export function useActions() {
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const notify = useCallback(
    (message: string, error = false) => setToast({ message, error }),
    [],
  );
  useEffect(() => {
    if (!toast || toast.error) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function run(
    label: string,
    action: () => Promise<void>,
    message?: string,
  ) {
    if (busy) return;
    setBusy(label);
    try {
      await action();
      if (message) notify(message);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), true);
    } finally {
      setBusy('');
    }
  }

  return { busy, setBusy, toast, setToast, notify, run };
}
export type Actions = ReturnType<typeof useActions>;
