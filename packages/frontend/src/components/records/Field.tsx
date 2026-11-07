interface FieldProps {
  label: string;
  value: string | number | null | undefined;
  /** Small secondary line under the value (e.g. scientific name, editor). */
  note?: string | null;
  /** Render the value as a link (`mailto:` / `tel:`). */
  href?: string;
  /** Span both columns of the grid. */
  wide?: boolean;
}

/** Label/value pair. Empty values show "Not recorded" so gaps are visible. */
export function Field({ label, value, note, href, wide }: FieldProps) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="type-caption text-body-muted">{label}</dt>
      <dd className="type-body text-body">
        {isEmpty ? (
          <span className="text-body-muted">Not recorded</span>
        ) : href ? (
          <a href={href} className="text-primary underline underline-offset-2">
            {value}
          </a>
        ) : (
          value
        )}
        {!isEmpty && note && (
          <span className="type-caption block text-body-muted">{note}</span>
        )}
      </dd>
    </div>
  );
}

/** Two-column description list holding `Field`s. */
export function FieldList({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-4">{children}</dl>;
}
