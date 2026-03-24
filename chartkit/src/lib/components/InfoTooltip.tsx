import { useId, useState } from "react";

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="ck-info-tooltip-anchor"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="ck-info-dot ck-info-trigger"
        aria-label="Show info"
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        i
      </button>
      {open ? (
        <span id={tooltipId} role="tooltip" className="ck-ui-tooltip">
          {text}
        </span>
      ) : null}
    </span>
  );
}
