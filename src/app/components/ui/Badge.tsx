import { cn } from "../../utils/cn";
import { HTMLAttributes, forwardRef } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "critical" | "warning" | "success" | "info" | "outline";
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          {
            "border-[#30363D] bg-[#30363D] text-[#e9ebef]": variant === "default",
            "border-[#F85149]/30 bg-[#F85149]/15 text-[#F85149]": variant === "critical",
            "border-[#D29922]/30 bg-[#D29922]/15 text-[#D29922]": variant === "warning",
            "border-[#3FB950]/30 bg-[#3FB950]/15 text-[#3FB950]": variant === "success",
            "border-[#2F81F7]/30 bg-[#2F81F7]/15 text-[#2F81F7]": variant === "info",
            "text-white border-[#30363D] bg-transparent": variant === "outline",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
