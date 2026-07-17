import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-violet-500/70 focus-visible:ring-2 focus-visible:ring-violet-600/40 dark:focus-visible:border-violet-400/60 dark:focus-visible:ring-violet-500/35 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
