import type { HostParams } from "../runtime/definitions";
import type {
  ChartKitControlOption,
  NamespaceSnapshot,
} from "../runtime/registry";

export function normalizeControlOptions(
  options: Array<ChartKitControlOption | string>,
): ChartKitControlOption[] {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
}

function hasParamOverride(params: HostParams | undefined, id: string): boolean {
  return params !== undefined && Object.prototype.hasOwnProperty.call(params, id);
}

export function resolveActiveControlValue(
  snapshot: NamespaceSnapshot,
  id: string,
  defaultValue: string,
): string {
  const current = snapshot.controls.get(id);
  if (current?.dirty) {
    return current.value;
  }
  if (hasParamOverride(snapshot.config?.params, id)) {
    return String(snapshot.config?.params[id] ?? "");
  }
  return current?.value ?? defaultValue;
}
