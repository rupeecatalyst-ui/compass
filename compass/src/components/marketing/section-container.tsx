import { cn } from "@/lib/utils";

interface SectionContainerProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionContainer({ id, children, className }: SectionContainerProps) {
  return (
    <section id={id} className={cn("py-16 sm:py-20 lg:py-24", className)}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
