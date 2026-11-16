import type { TreeRecord } from "@repo/common";
import { Field, FieldList } from "@frontend/components/records/Field.tsx";
import { fieldGuidance as g } from "@frontend/components/records/fieldGuidance.ts";
import { RecordHeader } from "@frontend/components/records/RecordHeader.tsx";
import { RecordMapPreview } from "@frontend/components/records/RecordMapPreview.tsx";
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

      <RecordSection title="Location" defaultOpen>
        <div className="flex flex-col gap-4">
          <FieldList>
            <Field
              label="Address"
              info={g.address}
              value={`${record.address}, ${record.city}, ${record.state}`}
            />
            <Field
              label="DPW or private"
              info={g.ownership}
              value={location.ownership}
            />
            <Field
              label="Location description & landmarks"
              info={g.locationDescription}
              value={location.description}
              wide
            />
          </FieldList>
          <RecordMapPreview record={record} />
        </div>
      </RecordSection>

      <RecordSection title="Contacts">
        <FieldList>
          <Field
            label="Tree host"
            info={g.treeHost}
            value={contacts.treeHost}
          />
          <Field
            label="Property owner"
            info={g.propertyOwner}
            value={contacts.propertyOwner}
          />
          <Field
            label="Email"
            info={g.email}
            value={contacts.email}
            href={contacts.email ? `mailto:${contacts.email}` : undefined}
            wide
          />
          <Field
            label="Phone"
            info={g.phone}
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

      <RecordSection title="Site assessment">
        <FieldList>
          <Field
            label="Tree lawn / ROW space"
            info={g.treeLawnRowSpace}
            value={siteAssessment.treeLawnRowSpace}
          />
          <Field
            label="If not in ROW"
            info={g.ifNotInRow}
            value={siteAssessment.ifNotInRow}
          />
          <Field
            label="Exposure"
            info={g.exposure}
            value={siteAssessment.energyDirection}
          />
          <Field
            label="Wire conflict"
            info={g.wireConflict}
            value={siteAssessment.wireConflict}
          />
          <Field
            label="Preparation required"
            info={g.preparationRequired}
            value={siteAssessment.preparationRequired}
            wide
          />
          <Field
            label="Next steps / general notes"
            info={g.notes}
            value={siteAssessment.notes}
            wide
          />
        </FieldList>
      </RecordSection>

      <RecordSection title="Planting preparation">
        <FieldList>
          <Field
            label="Spot flagged"
            info={g.spotFlagged}
            value={plantingPreparation.spotFlagged}
          />
          <Field
            label="Coming Soon sign"
            info={g.comingSoonSign}
            value={plantingPreparation.comingSoonSign}
          />
          <Field
            label="Utilities marked"
            info={g.utilitiesMarked}
            value={plantingPreparation.utilityMarked}
          />
          <Field
            label="Ready to plant"
            info={g.readyToPlant}
            value={plantingPreparation.readyToPlant}
          />
        </FieldList>
      </RecordSection>

      <RecordSection title="Tree details">
        <FieldList>
          <Field
            label="Species"
            info={g.species}
            value={record.species}
            note={record.scientificName}
          />
          <Field
            label="Cultivar"
            info={g.cultivar}
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

      <RecordSection title="Event & planting details">
        <FieldList>
          <Field
            label="Event"
            info={g.event}
            value={eventPlantingDetails.event}
          />
          <Field
            label="Event Year"
            info={g.eventYear}
            value={eventPlantingDetails.year}
          />
          <Field
            label="Tree Toga number"
            info={g.treeTogaNumber}
            value={eventPlantingDetails.treeTogaNumber}
            wide
          />
          <Field
            label="Planting date"
            info={g.plantingDate}
            value={formatDate(eventPlantingDetails.plantingDate)}
          />
          <Field
            label="Planted by"
            info={g.plantedBy}
            value={eventPlantingDetails.plantedBy}
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
          <Field label="Record ID" value={record.id} wide />
        </FieldList>
      </RecordSection>
    </div>
  );
}
