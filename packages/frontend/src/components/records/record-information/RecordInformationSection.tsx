
import type { RecordInformationValue } from "./types.ts";

type Props = {
  value: RecordInformationValue;
};

function formatDate(date: string | null) {
  if (!date) return "Not available";

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function InformationField({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string | null;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[12px] font-normal text-body-muted">
        {label}
      </p>

      <p className="text-[14px] font-normal text-heading">
        {value || "Not available"}
      </p>

      {note && (
        <p className="text-[12px] font-normal text-body-muted">
          {note}
        </p>
      )}
    </div>
  );
}

export function RecordInformationSection({ value }: Props) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      {/* Last edited */}
      <InformationField
        label="Last edited"
        value={formatDate(value.lastEditedAt)}
        note={value.lastEditedBy}
      />

      {/* Created */}
      <InformationField
        label="Created"
        value={formatDate(value.createdAt)}
        note={value.createdBy}
      />

      {/* Record ID */}
      <div className="col-span-2">
        <InformationField
          label="Record ID"
          value={value.recordId}
        />
      </div>
    </div>
  );
}
