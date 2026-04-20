import React from 'react'
import { cn } from '../../lib/utils'

export const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus-visible:outline-none focus-visible:border-gray-400 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'
