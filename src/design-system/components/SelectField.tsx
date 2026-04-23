'use client';

/**
 * SelectField
 * ===========
 * Thin wrapper around native <select> that enforces an invitational
 * placeholder. No fancy styling — inherits from caller's parent context.
 *
 * Brand voice: "Choose from the list" instead of "-- Select --".
 */

export interface SelectFieldProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string; // default: "Choose from the list"
  id?: string;
  name?: string;
  required?: boolean; // no visual "Required" badge — used only for form validation
  ariaLabel?: string;
}

export default function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Choose from the list',
  id,
  name,
  required = false,
  ariaLabel,
}: SelectFieldProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: 'block',
            marginBottom: 8,
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {label}
        </label>
      )}
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-label={ariaLabel}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '14px',
          borderRadius: '4px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          backgroundColor: '#fff',
          color: '#333',
          fontFamily: 'inherit',
        }}
      >
        <option value="" disabled selected>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
