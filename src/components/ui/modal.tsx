"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

// Open modals, innermost last, so Escape only closes the one on top.
const stack: symbol[] = [];

export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const id = Symbol("modal");
    stack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === id) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(id), 1);
      if (stack.length === 0) document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-[#0e0c0a]/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} card shadow-lift max-h-[92dvh] flex flex-col`}>
        <div className="flex items-center justify-between border-b border-paper-200 px-5 py-4">
          <h2 className="font-serif text-[22px] leading-none text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-ink-400 hover:bg-paper-200 hover:text-ink-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
