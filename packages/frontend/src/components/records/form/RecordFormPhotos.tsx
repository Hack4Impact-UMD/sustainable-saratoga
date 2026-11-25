import { useRef } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@frontend/components/ui/button.tsx";
import type { FormPhoto } from "@frontend/components/records/form/recordFormValues.ts";
import { formatDate } from "@frontend/lib/formatDate.ts";

/** Editable photo grid */
/* TODO: in another task */
export function RecordFormPhotos({
  photos,
  onChange,
}: {
  photos: FormPhoto[];
  onChange: (photos: FormPhoto[]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  function remove(photo: FormPhoto) {
    if (photo.src.startsWith("blob:")) URL.revokeObjectURL?.(photo.src);
    onChange(photos.filter((p) => p.src !== photo.src));
  }

  function add(files: FileList | null) {
    const picked = Array.from(files ?? []);
    if (picked.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const added = picked.map((file) => ({
      src: URL.createObjectURL(file),
      caption: file.name.replace(/\.[^.]+$/, "") || "New photo",
      takenAt: today,
    }));
    onChange([...photos, ...added]);
  }

  return (
    <div className="flex flex-col gap-4">
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" data-testid="photo-grid">
          {photos.map((photo) => (
            <li key={photo.src} className="flex min-w-0 flex-col gap-1">
              <div className="relative">
                <img
                  src={photo.src}
                  alt={photo.caption}
                  className="aspect-[114/100] w-full rounded-md border border-divider bg-pressed object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove photo: ${photo.caption}`}
                  onClick={() => remove(photo)}
                  className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-black text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </div>
              <span className="type-chip text-heading">{photo.caption}</span>
              <span className="type-caption text-body-muted">
                {formatDate(photo.takenAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="photo-file-input"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="type-btn-secondary h-12 w-full rounded-pill border-primary bg-surface px-4 text-primary hover:bg-hover"
        onClick={() => fileInput.current?.click()}
      >
        <PlusIcon aria-hidden="true" className="size-5" />
        Add photos
      </Button>
    </div>
  );
}