import { useMemo } from "react";

type RezendFormConfig = {
  /** Developer-provided stable identifier for the form */
  id: string;
};

export type { RezendFormConfig };

export function useRezendForm(config: RezendFormConfig) {
  return useMemo(() => ({ id: config.id }), [config.id]);
}
