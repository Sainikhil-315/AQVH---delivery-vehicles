/**
 * Toggle component for switching between options.
 * Used for routing mode selection and other binary choices.
 */
import React from 'react';

const Toggle = ({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  color = 'blue',
  label,
  description,
  className = '',
  id
}) => {
  // Size variants
  const sizeClasses = {
    sm: {
      switch: 'h-5 w-9',
      circle: 'h-4 w-4',
      translate: 'translate-x-4'
    },
    md: {
      switch: 'h-6 w-11', 
      circle: 'h-5 w-5',
      translate: 'translate-x-5'
    },
    lg: {
      switch: 'h-7 w-14',
      circle: 'h-6 w-6', 
      translate: 'translate-x-7'
    }
  };

  // Color variants
  const colorClasses = {
    blue: checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600',
    green: checked ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600',
    purple: checked ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600',
    red: checked ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-600'
  };

  const currentSize = sizeClasses[size];
  const currentColor = colorClasses[color];

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const toggleElement = (
    <button
      type="button"
      className={`
        relative inline-flex ${currentSize.switch} items-center rounded-full
        ${currentColor}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500
        ${className}
      `}
      onClick={handleToggle}
      disabled={disabled}
      id={id}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={`
          ${checked ? currentSize.translate : 'translate-x-0'}
          pointer-events-none relative inline-block ${currentSize.circle}
          transform rounded-full bg-white shadow ring-0
          transition duration-200 ease-in-out
        `}
      >
        <span
          className={`
            ${checked ? 'opacity-0 ease-out duration-100' : 'opacity-100 ease-in duration-200'}
            absolute inset-0 flex h-full w-full items-center justify-center transition-opacity
          `}
          aria-hidden="true"
        >
          {/* Off icon */}
          <svg
            className={`h-${size === 'sm' ? '3' : size === 'lg' ? '4' : '3'} w-${size === 'sm' ? '3' : size === 'lg' ? '4' : '3'} text-gray-400`}
            fill="none"
            viewBox="0 0 12 12"
          >
            <path
              d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span
          className={`
            ${checked ? 'opacity-100 ease-in duration-200' : 'opacity-0 ease-out duration-100'}
            absolute inset-0 flex h-full w-full items-center justify-center transition-opacity
          `}
          aria-hidden="true"
        >
          {/* On icon */}
          <svg
            className={`h-${size === 'sm' ? '3' : size === 'lg' ? '4' : '3'} w-${size === 'sm' ? '3' : size === 'lg' ? '4' : '3'} text-${color}-600`}
            fill="currentColor"
            viewBox="0 0 12 12"
          >
            <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 7l-.707.707a1 1 0 001.414 0L5 7zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-6.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z"/>
          </svg>
        </span>
      </span>
    </button>
  );

  if (label || description) {
    return (
      <div className={`flex items-start ${className}`}>
        <div className="flex h-5 items-center">
          {toggleElement}
        </div>
        <div className="ml-3 text-sm">
          {label && (
            <label 
              htmlFor={id}
              className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'} cursor-pointer`}
            >
              {label}
            </label>
          )}
          {description && (
            <p className={`${disabled ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }

  return toggleElement;
};

// Simple toggle variant for inline use
export const SimpleToggle = ({ checked, onChange, disabled, className = '' }) => {
  return (
    <Toggle
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      size="sm"
      className={className}
    />
  );
};

// Toggle with icons variant
export const IconToggle = ({ 
  checked, 
  onChange, 
  disabled, 
  onIcon, 
  offIcon, 
  className = '' 
}) => {
  return (
    <button
      type="button"
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full
        ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${className}
      `}
      onClick={() => !disabled && onChange && onChange(!checked)}
      disabled={disabled}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={`
          ${checked ? 'translate-x-6' : 'translate-x-1'}
          inline-block h-4 w-4 transform rounded-full bg-white
          transition duration-200 ease-in-out flex items-center justify-center
        `}
      >
        {checked ? (
          onIcon || (
            <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          )
        ) : (
          offIcon || (
            <svg className="h-3 w-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          )
        )}
      </span>
    </button>
  );
};

export default Toggle;