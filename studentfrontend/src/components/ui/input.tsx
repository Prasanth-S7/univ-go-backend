import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { showPasswordToggle?: boolean }
>(({ className, type, showPasswordToggle = false, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  
  const isPassword = type === "password";
  const inputType = isPassword && showPasswordToggle ? (visible ? "text" : "password") : type;

  return (
    <div className="relative w-full">
      <input
        type={inputType}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
      {isPassword && showPasswordToggle && (
        <button
          type="button"
          className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
});

Input.displayName = "Input";

export { Input };