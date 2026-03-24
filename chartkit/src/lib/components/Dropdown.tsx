import { useLayoutEffect, useMemo, useRef } from "react";
import {
  registerControlDefinition,
  setNamespaceControlValue,
  type ChartKitControlOption,
} from "../runtime/registry";
import { normalizeControlOptions, resolveActiveControlValue } from "./controlUtils";
import { themeVars } from "./themeVars";
import { useChartKitNamespace } from "./useChartKitNamespace";

export interface DropdownProps {
  namespace: string;
  id: string;
  label: string;
  title?: string;
  options: Array<ChartKitControlOption | string>;
  defaultValue: string;
}

export function Dropdown({
  namespace,
  id,
  label,
  title,
  options,
  defaultValue,
}: DropdownProps) {
  const ownerRef = useRef<symbol | null>(null);
  if (!ownerRef.current) {
    ownerRef.current = Symbol(`dropdown:${namespace}:${id}`);
  }
  const optionsKey = useMemo(() => JSON.stringify(options), [options]);
  const normalizedOptions = useMemo(() => normalizeControlOptions(options), [optionsKey]);
  const { snapshot, theme } = useChartKitNamespace(namespace);

  useLayoutEffect(() => {
    return registerControlDefinition(
      namespace,
      {
        id,
        type: "dropdown",
        label,
        title,
        options: normalizedOptions,
        defaultValue,
      },
      ownerRef.current as symbol,
    );
  }, [defaultValue, id, label, namespace, optionsKey, title]);

  const activeValue = resolveActiveControlValue(snapshot, id, defaultValue);
  const activeLabel =
    normalizedOptions.find((option) => option.value === activeValue)?.label ?? activeValue;

  return (
    <div className="ck-dropdown-wrap" style={themeVars(theme)}>
      <label className="ck-dropdown-label" htmlFor={`${namespace}-${id}`}>
        {title ?? label}
      </label>
      <div className="ck-dropdown-control">
        <select
          id={`${namespace}-${id}`}
          className="ck-dropdown"
          value={activeValue}
          onChange={(event) => setNamespaceControlValue(namespace, id, event.target.value)}
        >
          {normalizedOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="ck-dropdown-value">{activeLabel}</span>
        <span className="ck-dropdown-caret" aria-hidden="true" />
      </div>
    </div>
  );
}
