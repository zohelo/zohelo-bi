import { useEffect, useState } from "react";

export type Loaded<T> = { data?: T; error?: string; loading: boolean };

/** Runs an async loader whenever key changes; ignores answers to stale keys. */
export function useData<T>(key: string | null, load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ loading: key !== null });
  // Reset when the key changes, during render rather than in the effect (no extra render pass).
  const [shownKey, setShownKey] = useState(key);
  if (key !== shownKey) {
    setShownKey(key);
    setState(key === null ? { loading: false } : { data: state.data, loading: true });
  }
  useEffect(() => {
    if (key === null) return;
    let live = true;
    load().then(
      (data) => live && setState({ data, loading: false }),
      (e: unknown) => live && setState({ error: e instanceof Error ? e.message : String(e), loading: false }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key identifies the load
  }, [key]);
  return state;
}
