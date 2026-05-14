import { cn } from "../../utils/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger" | "success";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[#2F81F7] text-white hover:bg-[#2F81F7]/90": variant === "default",
            "border border-[#30363D] bg-transparent hover:bg-[#30363D] text-white": variant === "outline",
            "hover:bg-[#30363D] text-[#e9ebef] hover:text-white": variant === "ghost",
            "bg-[#F85149] text-white hover:bg-[#F85149]/90": variant === "danger",
            "bg-[#3FB950] text-white hover:bg-[#3FB950]/90": variant === "success",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
