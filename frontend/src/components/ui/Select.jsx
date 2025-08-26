import React from 'react'
import { clsx } from 'clsx'

const Select = ({ 
  label, 
  error, 
  options = [], 
  className, 
  disabled = false,
  ...props 
}) => {
  const selectClasses = clsx(
    'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors',
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
      <select
        className={selectClasses}
        disabled={disabled}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

export default Select