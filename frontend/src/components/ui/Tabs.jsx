import React, { useState } from 'react'
import { clsx } from 'clsx'

const Tabs = ({ children, defaultTab = 0, onChange }) => {
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Filter out falsy children (like conditionally rendered tabs)
  const validChildren = React.Children.toArray(children).filter(Boolean)

  const handleTabChange = (index) => {
    setActiveTab(index)
    onChange?.(index)
  }

  if (validChildren.length === 0) {
    return <div>No tabs available</div>
  }

  return (
    <div className="w-full">
      <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
        {validChildren.map((child, index) => (
          <button
            key={child.props.label || index}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none',
              {
                'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:text-primary-400 dark:border-primary-400 dark:bg-primary-950': activeTab === index,
                'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800': activeTab !== index
              }
            )}
            onClick={() => handleTabChange(index)}
          >
            {child.props.label || `Tab ${index + 1}`}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {validChildren[activeTab] || <div>No content available</div>}
      </div>
    </div>
  )
}

const Tab = ({ children }) => {
  return <div>{children}</div>
}

Tabs.Tab = Tab
export default Tabs