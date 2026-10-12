import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export default function HeaderDropdown({
  label,
  trigger,
  className = "",
  triggerClass = "",
  children,
}: {
  label: string;
  trigger: ReactNode;
  className?: string;
  triggerClass?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      ref={root}
      className={`header-dropdown ${className}`}
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          button.current?.focus();
        }
        if (event.key === "ArrowDown" && event.target === button.current) {
          event.preventDefault();
          setOpen(true);
          requestAnimationFrame(() =>
            root.current
              ?.querySelector<HTMLElement>(
                ".header-dropdown-panel a, .header-dropdown-panel button",
              )
              ?.focus(),
          );
        }
      }}
    >
      <button
        ref={button}
        type="button"
        className={triggerClass}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          className="header-dropdown-panel"
          onClick={(event) => {
            if ((event.target as Element).closest("a[href], button"))
              setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
