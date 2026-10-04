"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "urgent";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-deep disabled:bg-brand/60",
  secondary: "bg-surface text-ink border-2 border-line hover:border-brand hover:bg-brand-soft",
  ghost: "bg-transparent text-calm underline-offset-4 hover:underline",
  danger: "bg-surface text-urgent border-2 border-urgent/50 hover:bg-urgent-soft",
  urgent: "bg-urgent text-white hover:bg-urgent/90",
};
const SIZES: Record<Size, string> = {
  md: "min-h-touch px-5 py-2.5 text-lg",
  lg: "min-h-action px-6 py-4 text-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", full = false) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-colors disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    full ? "w-full" : "",
  ].join(" ");
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
}

export function Button({ variant = "primary", size = "md", full, loading, loadingText, icon, children, className = "", disabled, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClass(variant, size, full)} ${className}`}
    >
      {loading ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : icon}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  full,
  icon,
  children,
  className = "",
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const external = href.startsWith("tel:") || href.startsWith("http");
  const cls = `${buttonClass(variant, size, full)} ${className}`;
  if (external) {
    return (
      <a href={href} className={cls}>
        {icon}
        <span>{children}</span>
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}
