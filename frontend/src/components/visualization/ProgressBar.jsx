import React from 'react'
import { clsx } from 'clsx'

const ProgressBar = ({ 
  progress = 0, 
  variant = 'primary', 
  size = 'md',
  showPercentage = true,
  animated = false,
  className = '',
  label = ''
}) => {
  const progressValue = Math.max(0, Math.min(100, progress))

  const variants = {
    primary: 'bg-primary-600',
    quantum: 'progress-quantum',
    classical: 'progress-classical',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  }

  const sizes = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  return (
    <div className={clsx('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {progressValue.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      
      <div className={clsx(
        'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
        sizes[size]
      )}>
        <div
          className={clsx(
            'h-full transition-all duration-300 ease-out rounded-full',
            variants[variant],
            {
              'animate-pulse': animated && progressValue > 0 && progressValue < 100
            }
          )}
          style={{ width: `${progressValue}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar