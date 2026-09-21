import type { ReactNode } from "react";

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 py-5 dark:border-slate-800">
      <h2 className="mb-2 text-xs font-medium tracking-widest text-slate-500 uppercase dark:text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  );
}
