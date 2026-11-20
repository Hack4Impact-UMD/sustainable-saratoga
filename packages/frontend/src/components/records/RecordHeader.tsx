import { recordPipelineState } from "@repo/common";
import type { TreeRecord } from "@repo/common";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ImageIcon, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StatusPipeline } from "@frontend/components/status/StatusPipeline.tsx";
import { formatDate } from "@frontend/lib/formatDate.ts";

/** "Species not recorded · Tree #2" style line under the address. */
function speciesLine(record: TreeRecord): string {
  if (record.species) return record.species;
  return record.treeCount > 1
    ? `Species not recorded · Tree #${record.treeNumber}`
    : "Species not recorded";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** True once the referenced element has scrolled above the top of the page. */
function useScrolledPast(ref: React.RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry)
        setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return past;
}

/** Top bar, address, species, city, photo, responsible person and status. */
export function RecordHeader({ record }: { record: TreeRecord }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const scrolled = useScrolledPast(titleRef);

  const photo = [...record.photos].sort((a, b) =>
    b.takenAt.localeCompare(a.takenAt),
  )[0];
  // Latest photo's date; the created date when there are no photos.
  const date = formatDate(
    photo ? photo.takenAt : record.recordInformation.createdAt,
  );

  return (
    <>
      {/* Outside <header>: a sticky element only sticks within its parent, and
          the header ends before the sections, so inside it the bar would
          scroll away. Here the parent is the whole record page. */}
      <div className="sticky top-0 z-20 grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-divider bg-surface px-4">
        <Link
          to="/"
          className="type-body-strong inline-flex items-center gap-1 text-heading"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
          Records
        </Link>
        <p
          aria-hidden={!scrolled}
          data-testid="topbar-address"
          className={`type-body-strong min-w-0 truncate text-center font-display text-heading transition-opacity duration-150 ${scrolled ? "opacity-100" : "opacity-0"}`}
        >
          {record.address}
        </p>
        {/* TODO: link to the edit flow (Flow 7) once that page exists. */}
        <button
          type="button"
          className="type-btn-secondary inline-flex h-9 items-center gap-1.5 rounded-pill border border-primary bg-surface px-4 text-primary hover:bg-hover"
        >
          <Pencil aria-hidden="true" className="size-4" />
          Edit
        </button>
      </div>
      <header className="flex flex-col gap-4 px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 ref={titleRef} className="type-h1 text-heading">
              {record.address}
            </h1>
            <p className="type-body text-body-muted">
              {record.city}, {record.state}
            </p>
            <p className="type-body text-body">{speciesLine(record)}</p>
          </div>
          {photo ? (
            <img
              src={photo.src}
              alt={`${record.address}, ${photo.caption}`}
              className="size-22 shrink-0 rounded-md border border-divider bg-pressed object-cover"
            />
          ) : (
            <div className="flex size-22 shrink-0 items-center justify-center rounded-md border border-divider bg-pressed text-icon-secondary">
              <ImageIcon aria-label="No photo" className="size-8" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="type-body flex min-w-0 items-center gap-2 text-body-muted">
            Responsible:
            {record.responsible ? (
              <span className="type-body-strong inline-flex min-w-0 items-center gap-2 rounded-pill border border-divider bg-surface py-0.5 pr-3 pl-0.5 text-heading">
                <span
                  aria-hidden="true"
                  className="type-badge grid size-7 shrink-0 place-items-center rounded-pill bg-status-planted text-on-primary"
                >
                  {initials(record.responsible)}
                </span>
                <span className="truncate">{record.responsible}</span>
              </span>
            ) : (
              <span className="text-body-muted">Not recorded</span>
            )}
          </p>
          {date && (
            <p className="type-caption shrink-0 text-body-muted">{date}</p>
          )}
        </div>
        <StatusPipeline
          {...recordPipelineState.assert({
            origin: record.origin,
            status: record.status,
          })}
        />
      </header>
    </>
  );
}
