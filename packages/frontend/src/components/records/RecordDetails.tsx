import type { TreeRecord } from "@repo/common";
import { Link } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { Field, FieldList } from "@frontend/components/records/Field.tsx";
import { RecordHeader } from "@frontend/components/records/RecordHeader.tsx";
import { RecordPhotos } from "@frontend/components/records/RecordPhotos.tsx";
import { RecordSection } from "@frontend/components/records/RecordSection.tsx";
import { formatDate } from "@frontend/lib/formatDate.ts";

/** Read-only record details: header plus the eight collapsible sections. */
export function RecordDetails({ record }: { record: TreeRecord }) {
  const { location, siteAssessment, plantingPreparation } = record;
  const { contacts, eventPlantingDetails, recordInformation } = record;

  return (
    <div>
      <RecordHeader record={record} />

      <RecordSection title="Location">
        <div className="flex flex-col gap-4">
          <FieldList>
            <Field
              label="Address"
              value={`${record.address}, ${record.city}, ${record.state}`}
            />
            <Field label="DPW or private" value={location.ownership} />
            <Field
              label="Location description & landmarks"
              value={location.description}
              wide
            />
          </FieldList>
          <Link
            to="/"
            search={{ record: record.id }}
            className="type-btn-secondary inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill border border-primary bg-surface px-4 text-primary hover:bg-hover"
          >
            <Map aria-hidden="true" className="size-5" />
            View on map
          </Link>
        </div>
      </RecordSection>

      <RecordSection title="Site assessment">
        <FieldList>
          <Field
            label="Tree lawn / ROW space"
            value={siteAssessment.treeLawnRowSpace}
          />
          <Field label="If not in ROW" value={siteAssessment.ifNotInRow} />
          <Field
            label="Energy direction"
            value={siteAssessment.energyDirection}
          />
          <Field label="Wire conflict" value={siteAssessment.wireConflict} />
          <Field
            label="Preparation required"
            value={siteAssessment.preparationRequired}
            wide
          />
          <Field
            label="Next steps / general notes"
            value={siteAssessment.notes}
            wide
          />
        </FieldList>
      </RecordSection>

      <RecordSection title="Planting preparation">
        <FieldList>
          <Field label="Spot flagged" value={plantingPreparation.spotFlagged} />
          <Field
            label="Coming Soon sign"
            value={plantingPreparation.comingSoonSign}
          />
          <Field
            label="Utilities marked"
            value={plantingPreparation.utilityMarked}
          />
          <Field
            label="Ready to plant"
            value={plantingPreparation.readyToPlant}
          />
        </FieldList>
      </RecordSection>

      <RecordSection title="Tree details">
        <FieldList>
          <Field
            label="Species"
            value={record.species}
            note={record.scientificName}
          />
          <Field
            label="Cultivar"
            value={record.cultivar ? `\u2018${record.cultivar}\u2019` : null}
          />
        </FieldList>
      </RecordSection>

      <RecordSection
        title={
          record.photos.length > 0
            ? `Photos (${record.photos.length})`
            : "Photos"
        }
      >
        <RecordPhotos photos={record.photos} />
      </RecordSection>

      <RecordSection title="Contacts">
        <FieldList>
          <Field label="Tree host" value={contacts.treeHost} />
          <Field label="Property owner" value={contacts.propertyOwner} />
          <Field
            label="Email"
            value={contacts.email}
            href={contacts.email ? `mailto:${contacts.email}` : undefined}
            wide
          />
          <Field
            label="Phone"
            value={contacts.phone}
            href={
              contacts.phone
                ? `tel:${contacts.phone.replace(/[^\d+]/g, "")}`
                : undefined
            }
            wide
          />
        </FieldList>
      </RecordSection>

      <RecordSection title="Event & planting details">
        <FieldList>
          <Field label="Event" value={eventPlantingDetails.event} />
          <Field label="Year" value={eventPlantingDetails.year} />
          <Field
            label="Tree Toga number"
            value={eventPlantingDetails.treeTogaNumber}
            wide
          />
          <Field
            label="Planting date"
            value={formatDate(eventPlantingDetails.plantingDate)}
          />
          <Field
            label="Year planted"
            value={eventPlantingDetails.yearPlanted}
          />
          <Field
            label="Planted by"
            value={eventPlantingDetails.plantedBy}
            wide
          />
        </FieldList>
      </RecordSection>

      <RecordSection title="Record information">
        <FieldList>
          <Field
            label="Last edited"
            value={formatDate(recordInformation.lastEditedAt)}
            note={recordInformation.lastEditedBy}
          />
          <Field
            label="Created"
            value={formatDate(recordInformation.createdAt)}
            note={recordInformation.createdBy}
          />
        </FieldList>
      </RecordSection>
    </div>
  );
}
