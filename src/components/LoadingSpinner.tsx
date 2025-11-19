import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const sizeClasses = {
  small: 'w-4 h-4',
  medium: 'w-8 h-8',
  large: 'w-12 h-12'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  className = '' 
}) => {
  return (
    <div className={`${sizeClasses[size]} border-2 border-blue-500 border-t-transparent rounded-full animate-spin ${className}`} />
  );
};