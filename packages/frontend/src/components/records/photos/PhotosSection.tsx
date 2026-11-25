import { useEffect, useRef } from "react";

export type PhotoItem = {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  date: string;
};

type PhotosSectionProps = {
  value: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
};

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function PhotosSection({ value, onChange }: PhotosSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    return () => {
      value.forEach((photo) => {
        URL.revokeObjectURL(photo.previewUrl);
      });
    };
  }, [value]);

  function handleAddPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    const newPhotos: PhotoItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      title: file.name.replace(/\.[^/.]+$/, ""),
      date: getToday(),
    }));

    onChange([...value, ...newPhotos]);

    event.target.value = "";
  }

  function handleRemovePhoto(id: string) {
    const photo = value.find((item) => item.id === id);

    if (photo) {
      URL.revokeObjectURL(photo.previewUrl);
    }

    onChange(value.filter((photo) => photo.id !== id));
  }

  function handleUpdatePhoto(
    id: string,
    field: "title" | "date",
    newValue: string,
  ) {
    onChange(
      value.map((photo) =>
        photo.id === id ? { ...photo, [field]: newValue } : photo,
      ),
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {value.map((photo) => (
          <div key={photo.id} className="min-w-0 space-y-2">
            {/* Photo preview */}
            <div className="relative aspect-square overflow-hidden rounded-xl border border-divider bg-[#f0f0ee]">
              <img
                src={photo.previewUrl}
                alt={photo.title}
                className="h-full w-full object-cover"
              />

              <button
                type="button"
                onClick={() => handleRemovePhoto(photo.id)}
                aria-label="Remove photo"
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-[#292929]"
              >
                <span style={{ color: "#ffffff" }}>X</span>
              </button>
            </div>

            {/* Photo title */}
            <input
              type="text"
              value={photo.title}
              onChange={(event) =>
                handleUpdatePhoto(photo.id, "title", event.target.value)
              }
              placeholder="Photo title"
              className="w-full min-w-0 border-0 bg-transparent p-0 text-[14px] font-semibold text-heading outline-none"
            />

            {/* Photo date */}
            <input
              type="date"
              value={photo.date}
              onChange={(event) =>
                handleUpdatePhoto(photo.id, "date", event.target.value)
              }
              className="w-full border-0 bg-transparent p-0 text-[14px] text-body-muted outline-none"
            />
          </div>
        ))}
      </div>

      {/* Add photos */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAddPhotos}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-primary text-[15px] font-semibold text-primary"
      >
        <span className="text-2xl leading-none">+</span>
        Add photos
      </button>
    </section>
  );
}
