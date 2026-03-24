import { useLayoutEffect, useMemo, useRef } from "react";
import {
  registerControlDefinition,
  setNamespaceControlValue,
  type ChartKitControlOption,
} from "../runtime/registry";
import { normalizeControlOptions, resolveActiveControlValue } from "./controlUtils";
import { themeVars } from "./themeVars";
import { useChartKitNamespace } from "./useChartKitNamespace";

export interface ButtonGroupProps {
  namespace: string;
  id: string;
  label: string;
  title?: string;
  options: Array<ChartKitControlOption | string>;
  defaultValue: string;
}

export function ButtonGroup({
  namespace,
  id,
  label,
  title,
  options,
  defaultValue,
}: ButtonGroupProps) {
  const ownerRef = useRef<symbol | null>(null);
  if (!ownerRef.current) {
    ownerRef.current = Symbol(`button-group:${namespace}:${id}`);
  }
  const optionsKey = useMemo(() => JSON.stringify(options), [options]);
  const normalizedOptions = useMemo(() => normalizeControlOptions(options), [optionsKey]);
  const { snapshot, theme } = useChartKitNamespace(namespace);

  useLayoutEffect(() => {
    return registerControlDefinition(
      namespace,
      {
        id,
        type: "button_group",
        label,
        title,
        options: normalizedOptions,
        defaultValue,
      },
      ownerRef.current as symbol,
    );
  }, [defaultValue, id, label, namespace, optionsKey, title]);

  const activeValue = resolveActiveControlValue(snapshot, id, defaultValue);

  return (
    <div className="ck-segmented" style={themeVars(theme)}>
      {normalizedOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={activeValue === option.value ? "ck-segment ck-segment-active" : "ck-segment"}
          onClick={() => setNamespaceControlValue(namespace, id, option.value)}
          aria-pressed={activeValue === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
