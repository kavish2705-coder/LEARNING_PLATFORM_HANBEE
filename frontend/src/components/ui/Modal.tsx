"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./Modal.module.css";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  // Neither Modal instance is a portal, so two nested modals (e.g. a
  // confirm dialog opened from inside another modal) are plain DOM
  // siblings at the same z-index -- the later one in the tree paints on
  // top and silently eats the earlier one's clicks. ConfirmDialog passes
  // this to guarantee it always wins over whatever opened it.
  elevated?: boolean;
};

export default function Modal({ open, title, onClose, actions, children, elevated }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Callers pass onClose as an inline arrow function, so its identity
  // changes on every parent render. A ref keeps the Escape handler current
  // without putting onClose in the effect's dependency array below -- if it
  // were there, every parent re-render (e.g. a controlled input inside the
  // modal updating state on each keystroke) would re-run this effect and
  // re-grab focus onto the dialog's first focusable element, yanking focus
  // out of whatever the user was actively typing into.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input, select, textarea"),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      style={elevated ? { zIndex: 200 } : undefined}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className={styles.title}>{title}</h2>
        <div className={styles.body}>{children}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
