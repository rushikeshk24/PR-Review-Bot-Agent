import React from 'react';

export type BadgeVariant = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => {
  return <span className={`badge badge-${variant} ${className}`}>{children}</span>;
};
