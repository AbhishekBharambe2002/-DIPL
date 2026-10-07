import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variants = {
  primary: "btn-primary",
  secondary: "btn-ghost",
  ghost: "btn text-ink-600 hover:bg-paper-200 hover:text-ink-900",
  danger: "btn-danger",
};

const sizes = {
  sm: "!px-2.5 !py-1 !text-[12px]",
  md: "",
  lg: "!px-5 !py-2.5 !text-[14px]",
};

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        variants[variant],
        sizes[size],
        "justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
