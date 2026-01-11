/**
 * Input Component
 * Consistent form input styling.
 * Matches the landing page form patterns.
 */
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-navy-900 mb-2"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            w-full px-4 py-3 bg-white border rounded-xl
            text-navy-900 placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400
            transition-all duration-200
            disabled:bg-slate-50 disabled:cursor-not-allowed
            ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-slate-200'}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1 text-sm text-slate-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
