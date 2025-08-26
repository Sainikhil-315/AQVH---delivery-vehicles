import React from 'react'
import { clsx } from 'clsx'

const Input = ({ 
  label, 
  error, 
  className, 
  type = 'text', 
  disabled = false,
  ...props 
}) => {
  const inputClasses = clsx(
    'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors',
    {
      'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100': !error,
      'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 focus:ring-red-500 focus:border-red-500': error,
      'opacity-50 cursor-not-allowed': disabled
    },
    className
  )

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        type={type}
        className={inputClasses}
        disabled={disabled}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

export default Input