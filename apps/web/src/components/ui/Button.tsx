import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'padding: 0.35rem 0.75rem; font-size: 0.75rem;',
    md: 'padding: 0.55rem 1.1rem; font-size: 0.875rem;',
    lg: 'padding: 0.75rem 1.5rem; font-size: 1rem;',
  };

  return (
    <button
      className={`btn btn-${variant} ${className}`}
      style={{ cursor: props.disabled ? 'not-allowed' : 'pointer', opacity: props.disabled ? 0.6 : 1 }}
      {...props}
    >
      {children}
    </button>
  );
};
