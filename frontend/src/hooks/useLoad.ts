import { useEffect, useRef, useState } from "react";

export function useLoad<T>(key: string, loader: () => Promise<T>) {
  const [state, setState] = useState<{
    data?: T;
    loading: boolean;
    error: string;
  }>({ loading: true, error: "" });
  const [revision, setRevision] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  useEffect(() => {
    let active = true;
    setState({ loading: true, error: "" });
    loaderRef
      .current()
      .then((data) => {
        if (active) setState({ data, loading: false, error: "" });
      })
      .catch((e) => {
        if (active) setState({ loading: false, error: (e as Error).message });
      });
    return () => {
      active = false;
    };
  }, [key, revision]);
  return { ...state, reload: () => setRevision((n) => n + 1) };
}
