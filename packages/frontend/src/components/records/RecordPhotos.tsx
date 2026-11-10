import type { TreeRecord } from "@repo/common";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { formatDate } from "@frontend/lib/formatDate.ts";

export const PHOTO_PREVIEW_COUNT = 3;

/** Photo grid: a few thumbnails, with "View all N photos" to show the rest. */
export function RecordPhotos({ photos }: { photos: TreeRecord["photos"] }) {
  const [showAll, setShowAll] = useState(false);

  if (photos.length === 0) {
    return <p className="type-body text-body-muted">Not recorded</p>;
  }

  const visible = showAll ? photos : photos.slice(0, PHOTO_PREVIEW_COUNT);
  const canExpand = !showAll && photos.length > PHOTO_PREVIEW_COUNT;

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-3 gap-2" data-testid="photo-grid">
        {visible.map((photo) => (
          <li
            key={`${photo.caption}-${photo.takenAt}`}
            className="flex min-w-0 flex-col gap-1"
          >
            <img
              src={photo.src}
              alt={photo.caption}
              className="aspect-[114/100] w-full rounded-md border border-divider bg-pressed object-cover"
            />
            <span className="type-chip text-heading">{photo.caption}</span>
            <span className="type-caption text-body-muted">
              {formatDate(photo.takenAt)}
            </span>
          </li>
        ))}
      </ul>
      {canExpand && (
        <Button
          type="button"
          variant="outline"
          className="type-btn-secondary h-12 w-full rounded-pill border-primary bg-surface px-4 text-primary hover:bg-hover"
          onClick={() => setShowAll(true)}
        >
          <ImageIcon aria-hidden="true" className="size-5" />
          View all {photos.length} photos
        </Button>
      )}
    </div>
  );
}
