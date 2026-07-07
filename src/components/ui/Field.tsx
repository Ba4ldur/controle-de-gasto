import type { ReactNode, SelectHTMLAttributes } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldWrapProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Rótulo + campo + mensagem de erro/ajuda. */
export function FieldWrap({ label, htmlFor, error, hint, required, children, className = '' }: FieldWrapProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label-base">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  wrapClassName?: string;
};

export function TextField({ label, error, hint, wrapClassName, required, id, ...rest }: TextFieldProps) {
  return (
    <FieldWrap label={label} htmlFor={id} error={error} hint={hint} required={required} className={wrapClassName}>
      <input id={id} className="input-base" aria-invalid={!!error} {...rest} />
    </FieldWrap>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  wrapClassName?: string;
  options: { value: string; label: string }[];
};

export function SelectField({ label, error, hint, wrapClassName, required, id, options, ...rest }: SelectFieldProps) {
  return (
    <FieldWrap label={label} htmlFor={id} error={error} hint={hint} required={required} className={wrapClassName}>
      <select id={id} className="input-base" aria-invalid={!!error} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
  wrapClassName?: string;
};

export function TextAreaField({ label, error, hint, wrapClassName, required, id, ...rest }: TextAreaFieldProps) {
  return (
    <FieldWrap label={label} htmlFor={id} error={error} hint={hint} required={required} className={wrapClassName}>
      <textarea id={id} className="input-base min-h-[96px] resize-y" aria-invalid={!!error} {...rest} />
    </FieldWrap>
  );
}
