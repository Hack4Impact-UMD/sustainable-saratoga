import { useCallback, useMemo, useState } from "react";
import { getChangedFields } from "@frontend/components/records/form/recordFormValues.ts";
import type { RecordFormValues } from "@frontend/components/records/form/recordFormValues.ts";

/**
 * Form state for creating or editing a record, plus change tracking.
 *
 * `initialValues` is the baseline for "changed". Pass a stable object
 * (useMemo / module constant), because a new object every render makes
 * `reset` and `changedFields` recompute each time.
 *
 * The New/Edit Record screen uses `changedCount` for the Save button
 * (disabled when 0) and the "You changed N fields" message.
 */
export function useRecordForm(initialValues: RecordFormValues) {
  const [values, setValues] = useState<RecordFormValues>(initialValues);

  const setField = useCallback(
    <K extends keyof RecordFormValues>(key: K, value: RecordFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setFields = useCallback((patch: Partial<RecordFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setValues(initialValues), [initialValues]);

  const changedFields = useMemo(
    () => getChangedFields(initialValues, values),
    [initialValues, values],
  );

  return {
    values,
    initialValues,
    setField,
    setFields,
    reset,
    changedFields,
    changedCount: changedFields.length,
  };
}

export type RecordFormApi = ReturnType<typeof useRecordForm>;