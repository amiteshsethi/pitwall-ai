import type { ButtonHTMLAttributes, ReactNode } from "react"
import { Link } from "react-router-dom"

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost"

interface BaseProps {
  variant?: ButtonVariant
  children: ReactNode
  className?: string
}

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { to?: never }

type LinkButtonProps = BaseProps & {
  to: string
  onClick?: () => void
  type?: never
  disabled?: never
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-red-500 hover:bg-red-600 disabled:bg-[#7f1d1d] text-white font-bold rounded-2xl px-6 py-3 sm:py-4 transition-colors",
  secondary:
    "text-red-500 font-bold hover:text-red-400 transition-colors",
  outline:
    "border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold rounded-xl px-6 py-2.5 transition-colors",
  ghost:
    "border border-zinc-700 bg-zinc-950 hover:border-zinc-600 text-white font-semibold rounded-xl px-4 py-3 transition-colors",
}

function getClasses(variant: ButtonVariant, className: string) {
  return `${variantClasses[variant]} ${className}`.trim()
}

export default function Button(props: ButtonProps | LinkButtonProps) {
  const { variant = "primary", children, className = "" } = props

  if ("to" in props && props.to) {
    const { to, onClick } = props
    return (
      <Link to={to} onClick={onClick} className={getClasses(variant, className)}>
        {children}
      </Link>
    )
  }

  const { type = "button", disabled, onClick, ...rest } = props as ButtonProps

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${getClasses(variant, className)} disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
      {...rest}
    >
      {children}
    </button>
  )
}
