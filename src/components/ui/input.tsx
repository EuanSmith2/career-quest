import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-[50px] w-full rounded-btn border-2 bg-muted px-4 text-body text-foreground placeholder:text-disabled-fg focus:border-blue-border focus:bg-background focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
