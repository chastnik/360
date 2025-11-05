import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:w-4 [&_svg]:h-4 shrink-0 outline-none focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-sm hover:bg-primary-700 focus:ring-primary-500",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-500",
        outline:
          "border border-gray-300 bg-white hover:bg-gray-50 hover:text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white",
        secondary:
          "bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600",
        ghost:
          "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white",
        link: "text-primary-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs",
        lg: "h-11 rounded-md px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

