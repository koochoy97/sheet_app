import React from 'react'
import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-slate-900 text-white hover:bg-slate-800 border-transparent',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-transparent',
  outline: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300',
  destructive: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
  ghost: 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
}

export function Button({ className, variant = 'default', asChild = false, ...props }) {
  const Comp = asChild ? 'span' : 'button'
  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  )
}
