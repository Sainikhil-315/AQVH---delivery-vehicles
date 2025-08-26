import React from 'react'
import { clsx } from 'clsx'

const Card = ({ children, className, variant = 'default', ...props }) => {
  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    glass: 'glass',
    quantum: 'bg-gradient-to-br from-quantum-50 to-purple-50 dark:from-quantum-950 dark:to-purple-950 border border-quantum-200 dark:border-quantum-800'
  }

  return (
    <div
      className={clsx(
        'rounded-lg shadow-sm',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const CardHeader = ({ children, className, ...props }) => (
  <div className={clsx('px-6 py-4 border-b border-gray-200 dark:border-gray-700', className)} {...props}>
    {children}
  </div>
)

const CardContent = ({ children, className, ...props }) => (
  <div className={clsx('px-6 py-4', className)} {...props}>
    {children}
  </div>
)

const CardFooter = ({ children, className, ...props }) => (
  <div className={clsx('px-6 py-4 border-t border-gray-200 dark:border-gray-700', className)} {...props}>
    {children}
  </div>
)

Card.Header = CardHeader
Card.Content = CardContent
Card.Footer = CardFooter

export default Card