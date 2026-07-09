import React from 'react'
import { cn } from '../../lib/utils'

// Estilo SIETE (portado de Forms): botones tipo "pill" muy redondeados,
// azul #007AFF, tipografía Montserrat semibold.
const variants = {
  default: 'bg-brand-500 text-white hover:bg-brand-600 border-transparent shadow-sm',
  secondary: 'bg-muted text-foreground hover:bg-brand-50 border-transparent',
  outline: 'border-2 border-brand-500 bg-white text-brand-600 hover:bg-brand-50',
  destructive: 'bg-red-600 text-white hover:bg-red-700 border-transparent shadow-sm',
  ghost: 'border-transparent text-brand-600 hover:bg-brand-50',
}

export function Button({ className, variant = 'default', asChild = false, ...props }) {
  const Comp = asChild ? 'span' : 'button'
  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-full border px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  )
}
