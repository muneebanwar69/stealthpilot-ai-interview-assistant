import React from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassPanel({ children, className, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'glass-panel relative overflow-hidden',
        className
      )}
      {...props}
    >
      <div className="noise-overlay" />
      {children}
    </div>
  );
}
