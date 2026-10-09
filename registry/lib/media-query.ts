import { useSyncExternalStore } from "react";

/** Live `matchMedia`. Phone layout: `useMediaQuery("(max-width: 48rem)")`. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
  );
}

export const PHONE = "(max-width: 48rem)";
