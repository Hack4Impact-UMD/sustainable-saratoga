import { recordPipelineState } from "@repo/common";
import type { TreeRecord } from "@repo/common";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ImageIcon } from "lucide-react";
import { StatusPipeline } from "@frontend/components/status/StatusPipeline.tsx";
import { formatDate } from "@frontend/lib/formatDate.ts";

/** Back bar, address, species, city, latest photo and status pipeline. */
export function RecordHeader({ record }: { record: TreeRecord }) {
  const photo = record.photos.toSorted((a, b) =>
    b.takenAt.localeCompare(a.takenAt),
  )[0];
  const photoDate = formatDate(photo?.takenAt ?? record.latestPhotoDate);

  return (
    <header>
      <div className="border-b border-divider px-4 py-3">
        <Link
          to="/"
          className="type-body-strong inline-flex items-center gap-1 text-heading"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
          Records
        </Link>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="type-h1 text-heading">{record.address}</h1>
            <p className="type-body text-body-muted">
              <strong className="font-bold text-heading">
                {record.species || "Species not recorded"}
              </strong>{" "}
              · Tree #{record.treeNumber}
              {record.treeCount > 1 && (
                <span className="block type-caption">
                  {record.treeNumber} of {record.treeCount} at this address
                </span>
              )}
            </p>
            <p className="type-caption text-body-muted">
              {record.city}, {record.state}
            </p>
          </div>
          <figure className="m-0 flex w-22 shrink-0 flex-col items-end gap-2">
            {photo ? (
              <img
                src={photo.src}
                alt={`${record.address}, ${photo.caption}`}
                className="aspect-square w-full rounded-md border border-divider bg-pressed object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-md border border-divider bg-pressed text-icon-secondary">
                <ImageIcon aria-label="No photo" className="size-8" />
              </div>
            )}
            {photoDate && (
              <figcaption className="type-caption text-body-muted">
                {photoDate}
              </figcaption>
            )}
          </figure>
        </div>
        <StatusPipeline
          {...recordPipelineState.assert({
            origin: record.origin,
            status: record.status,
          })}
        />
      </div>
    </header>
  );
}
