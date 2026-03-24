import { useId, useRef, useState, type HTMLAttributes } from "react";

interface OverflowTooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  text: string;
  className?: string;
}

function hasOverflow(element: HTMLElement): boolean {
  return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
}

export function OverflowTooltip({ text, className, ...props }: OverflowTooltipProps) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const tooltipId = useId();
  const textRef = useRef<HTMLSpanElement | null>(null);

  const syncOverflow = () => {
    const nextEnabled = textRef.current ? hasOverflow(textRef.current) : false;
    setEnabled(nextEnabled);
    setOpen(nextEnabled);
  };

  const close = () => setOpen(false);

  return (
    <span
      className="ck-overflow-tooltip-anchor"
      onMouseEnter={syncOverflow}
      onMouseLeave={close}
    >
      <span
        {...props}
        ref={textRef}
        className={className}
        aria-describedby={open ? tooltipId : undefined}
      >
        {text}
      </span>
      {open && enabled ? (
        <span id={tooltipId} role="tooltip" className="ck-ui-tooltip ck-ui-tooltip-overflow">
          {text}
        </span>
      ) : null}
    </span>
  );
}
