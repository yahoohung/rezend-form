import type { PropsWithChildren } from "react";

interface GradientCardProps extends PropsWithChildren {
  title: string;
  description?: string;
  accent?: string;
  className?: string;
}

export function GradientCard({ title, description, accent, className, children }: GradientCardProps) {
  const baseClass = "glass-panel relative overflow-hidden";
  const wrapperClass = className ? `${className} ${baseClass}` : baseClass;

  return (
    <div className={wrapperClass}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            accent ||
            "linear-gradient(135deg, rgba(52, 211, 153, 0.45), rgba(59, 130, 246, 0.25))"
        }}
      />
      <div className="relative space-y-4 p-8">
        <div>
          <h3 className="text-xl font-semibold text-foreground/90">{title}</h3>
          {description && <p className="mt-2 text-sm text-foreground/70">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
