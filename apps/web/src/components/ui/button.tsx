import { forwardRef } from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className = "", variant = "primary", disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
    const styles =
      variant === "primary"
        ? "bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:outline-indigo-300"
        : variant === "danger"
          ? "bg-rose-600 text-white hover:bg-rose-500 focus-visible:outline-rose-300"
          : "bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:outline-slate-500";

    return (
      <button
        ref={ref}
        className={`${base} ${styles} ${className}`}
        disabled={disabled}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
