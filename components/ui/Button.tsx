/**
 * Button Component
 * Consistent button styling matching the landing page design system.
 * 
 * Variants:
 * - primary: Navy fill, white text (main CTAs)
 * - secondary: Light navy fill (card actions)
 * - outline: Border only (secondary actions)
 * - ghost: Text only with hover background
 * - danger: Red for destructive actions
 * - white: White fill for dark backgrounds
 */
import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';
import Link from 'next/link';

interface ButtonBaseProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'white';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

interface ButtonAsButtonProps extends ButtonBaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
  href?: never;
}

interface ButtonAsLinkProps extends ButtonBaseProps {
  href: string;
  onClick?: () => void;
}

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md',
    className = '',
    disabled = false,
    loading = false,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variantClasses = {
      primary: 'bg-navy-800 text-white hover:bg-navy-700 hover:shadow-xl focus:ring-sky-300 shadow-lg disabled:bg-slate-400',
      secondary: 'bg-navy-50 text-navy-800 hover:bg-navy-100 focus:ring-navy-200',
      outline: 'border-2 border-slate-200 text-slate-700 hover:border-navy-800 hover:text-navy-800 hover:bg-navy-50 focus:ring-navy-200',
      ghost: 'text-slate-600 hover:text-navy-900 hover:bg-slate-50 focus:ring-sky-200',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
      white: 'bg-white text-navy-900 hover:bg-sky-50 hover:shadow-xl hover:scale-105 shadow-lg focus:ring-sky-300',
    };
    
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm rounded-lg',
      md: 'px-5 py-2.5 text-sm rounded-lg',
      lg: 'px-7 py-3 text-base rounded-lg',
    };
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled || loading ? 'cursor-not-allowed opacity-60' : ''} ${className}`;
    
    const content = loading ? (
      <>
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading...
      </>
    ) : children;
    
    if ('href' in props && props.href) {
      return (
        <Link
          href={props.href}
          className={classes}
          onClick={props.onClick}
          ref={ref as React.Ref<HTMLAnchorElement>}
        >
          {content}
        </Link>
      );
    }
    
    const { href, ...buttonProps } = props as ButtonAsButtonProps;
    
    return (
      <button
        className={classes}
        disabled={disabled || loading}
        ref={ref as React.Ref<HTMLButtonElement>}
        {...buttonProps}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
