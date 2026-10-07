import { clsx } from "clsx";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface BaseProps {
  label: string;
  error?: string;
  required?: boolean;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="label mb-1.5 block">
      {label} {required && <span className="text-neg">*</span>}
    </label>
  );
}

const errCls = "!border-neg";

export function FormInput({ label, error, required, className, ...props }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} />
      <input className={clsx("field", error && errCls)} required={required} {...props} />
      {error && <p className="mt-1 text-[12px] text-neg">{error}</p>}
    </div>
  );
}

export function FormSelect({
  label,
  error,
  required,
  children,
  className,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} />
      <select className={clsx("field", error && errCls)} required={required} {...props}>
        {children}
      </select>
      {error && <p className="mt-1 text-[12px] text-neg">{error}</p>}
    </div>
  );
}

export function FormTextarea({
  label,
  error,
  required,
  className,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} />
      <textarea className={clsx("field", error && errCls)} rows={3} required={required} {...props} />
      {error && <p className="mt-1 text-[12px] text-neg">{error}</p>}
    </div>
  );
}
