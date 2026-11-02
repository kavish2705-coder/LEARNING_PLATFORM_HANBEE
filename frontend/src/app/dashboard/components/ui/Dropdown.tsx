"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./Dropdown.module.css";

export type DropdownOption = { value: string; label: string };

// A themed replacement for the raw <select>. Browsers render a <select>'s
// open option list as native, OS-drawn chrome -- its corners, shadow, and
// highlight color can't be styled with CSS, so it always looks like a
// jarring square-edged system popup dropped onto an otherwise rounded,
// themed page. This renders the whole dropdown ourselves instead.
export default function Dropdown({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  required,
  style,
  className,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  style?: CSSProperties;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`${styles.root} ${className ?? ""}`} ref={rootRef} style={style}>
      {/* Keeps this a real, required, submittable form field for validation
          and autofill, while the visible UI below replaces its look entirely. */}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className={styles.nativeShadow}
        tabIndex={-1}
        aria-hidden="true"
      >
        <option value="" disabled hidden>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <button
        type="button"
        className={styles.trigger}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={selected ? styles.triggerValue : styles.triggerPlaceholder}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={16} className={styles.chevron} style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>

      {open && (
        <ul className={styles.panel} role="listbox">
          {options.length === 0 ? (
            <li className={styles.empty}>No options available</li>
          ) : (
            options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`${styles.option} ${option.value === value ? styles.optionActive : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
