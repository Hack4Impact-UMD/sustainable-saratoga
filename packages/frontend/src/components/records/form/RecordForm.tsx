import type { ReactNode } from "react";
import type { TreeRecord } from "@repo/common";
import { fieldGuidance as g } from "@frontend/components/records/fieldGuidance.ts";
import {
  DateInput,
  NumberInput,
  RadioList,
  SegmentedChoice,
  SelectInput,
  TextArea,
  TextInput,
} from "@frontend/components/ui/form-controls.tsx";
import { FormField } from "@frontend/components/records/form/FormField.tsx";
import {
  eventOptions,
  eventYearOptions,
  exposureOptions,
  ifNotInRowOptions,
  ownershipOptions,
  propertyOwnerOptions,
  wireConflictOptions,
  yesNoOptions,
} from "@frontend/components/records/form/recordFormOptions.ts";
import type { RecordFormErrors } from "@frontend/components/records/form/recordFormValues.ts";
import { RecordInformation } from "@frontend/components/records/form/RecordInformation.tsx";
import { RecordFormPhotos } from "@frontend/components/records/form/RecordFormPhotos.tsx";
import {
  MemberPicker,
  SpeciesPicker,
  StatusPicker,
} from "@frontend/components/records/form/RecordFormPickers.tsx";
import { RecordSection } from "@frontend/components/records/RecordSection.tsx";
import type { RecordFormApi } from "@frontend/components/records/form/useRecordForm.ts";

const stack = "flex flex-col gap-4";

const statusInfo =
  "Where the tree is in the pipeline: Requested, Possible, Approved or Planted.";

const plantingChecks = [
  ["spotFlagged", "Planting spot flagged", g.spotFlagged],
  ["comingSoonSign", "Coming Soon sign placed", g.comingSoonSign],
  ["utilityMarked", "Utilities marked", g.utilitiesMarked],
  ["readyToPlant", "Ready to plant (optional)", g.readyToPlant],
] as const;

interface RecordFormProps {
  /** From useRecordForm(). The screen owns it so it can read changedCount. */
  form: RecordFormApi;
  /** Pass when editing, to show the read-only Record information section. */
  record?: TreeRecord;
  errors?: RecordFormErrors;
  /** Map preview + "Move pin" (E9), rendered under Address. */
  mapSlot?: ReactNode;
}

/** The record form used by both New record and Edit record (E1). */
export function RecordForm({
  form,
  record,
  errors = {},
  mapSlot,
}: RecordFormProps) {
  const { values, setField, setFields } = form;
  const years = eventYearOptions();
  const photoTitle =
    values.photos.length > 0 ? `Photos (${values.photos.length})` : "Photos";

  return (
    <div>
      <RecordSection title="Status & assignment" defaultOpen>
        <div className={stack}>
          <FormField
            label="Status"
            info={statusInfo}
            required
            error={errors.status}
          >
            {({ id, invalid, describedBy }) => (
              <StatusPicker
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                value={values.status}
                onChange={(status) => setField("status", status)}
              />
            )}
          </FormField>
          <FormField label="Responsible member" error={errors.responsible}>
            {({ id, invalid, describedBy }) => (
              <MemberPicker
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                value={values.responsible}
                onChange={(member) => setField("responsible", member)}
              />
            )}
          </FormField>
        </div>
      </RecordSection>

      <RecordSection title="Location" defaultOpen>
        <div className={stack}>
          <FormField label="Address" info={g.address} error={errors.address}>
            {({ id, invalid, describedBy }) => (
              <TextInput
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                autoComplete="street-address"
                value={values.address}
                onChange={(v) => setField("address", v)}
              />
            )}
          </FormField>
          {mapSlot}
          <FormField
            label="Location description & landmarks"
            info={g.locationDescription}
            error={errors.locationDescription}
          >
            {({ id, invalid, describedBy }) => (
              <TextArea
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                value={values.locationDescription}
                onChange={(v) => setField("locationDescription", v)}
              />
            )}
          </FormField>
          <FormField
            group
            label="DPW or private"
            info={g.ownership}
            error={errors.ownership}
          >
            {({ labelId }) => (
              <SegmentedChoice
                labelledBy={labelId}
                options={ownershipOptions}
                value={values.ownership}
                onChange={(v) => setField("ownership", v)}
              />
            )}
          </FormField>
        </div>
      </RecordSection>

      <RecordSection title="Contacts" defaultOpen>
        <div className={stack}>
          <FormField
            label="Tree host name"
            info={g.treeHost}
            error={errors.treeHost}
          >
            {({ id, invalid, describedBy }) => (
              <TextInput
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                autoComplete="name"
                value={values.treeHost}
                onChange={(v) => setField("treeHost", v)}
              />
            )}
          </FormField>
          <FormField label="Email" info={g.email} error={errors.email}>
            {({ id, invalid, describedBy }) => (
              <TextInput
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(v) => setField("email", v)}
              />
            )}
          </FormField>
          <FormField label="Phone" info={g.phone} error={errors.phone}>
            {({ id, invalid, describedBy }) => (
              <TextInput
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                type="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={(v) => setField("phone", v)}
              />
            )}
          </FormField>
          <FormField
            group
            label="Property owner"
            info={g.propertyOwner}
            error={errors.propertyOwner}
          >
            {({ labelId }) => (
              <SegmentedChoice
                labelledBy={labelId}
                options={propertyOwnerOptions}
                value={values.propertyOwner}
                onChange={(v) => setField("propertyOwner", v)}
              />
            )}
          </FormField>
        </div>
      </RecordSection>

      <RecordSection title="Site assessment" defaultOpen>
        <div className={stack}>
          <FormField
            label="Tree lawn / right-of-way space"
            info={g.treeLawnRowSpace}
            error={errors.treeLawnRowSpace}
          >
            {({ id, invalid, describedBy }) => (
              <NumberInput
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                value={values.treeLawnRowSpace}
                onChange={(v) => setField("treeLawnRowSpace", v)}
              />
            )}
          </FormField>
          <FormField
            group
            label="Placement if not in ROW"
            info={g.ifNotInRow}
            error={errors.ifNotInRow}
          >
            {({ labelId }) => (
              <RadioList
                labelledBy={labelId}
                options={ifNotInRowOptions}
                value={values.ifNotInRow}
                onChange={(v) => setField("ifNotInRow", v)}
              />
            )}
          </FormField>
          <FormField
            label="Exposure (energy-savings direction)"
            info={g.exposure}
            error={errors.energyDirection}
          >
            {({ id, invalid, describedBy }) => (
              <SelectInput
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                value={values.energyDirection}
                options={exposureOptions}
                onChange={(v) => setField("energyDirection", v)}
              />
            )}
          </FormField>
          <FormField
            group
            label="Wire conflict"
            info={g.wireConflict}
            error={errors.wireConflict}
          >
            {({ labelId }) => (
              <RadioList
                allowOther
                labelledBy={labelId}
                options={wireConflictOptions}
                value={values.wireConflict}
                onChange={(v) => setField("wireConflict", v)}
              />
            )}
          </FormField>
          <FormField
            label="Preparation required"
            info={g.preparationRequired}
            error={errors.preparationRequired}
          >
            {({ id, invalid, describedBy }) => (
              <TextInput
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                value={values.preparationRequired}
                onChange={(v) => setField("preparationRequired", v)}
              />
            )}
          </FormField>
          <FormField
            label="Next steps / general notes"
            info={g.notes}
            error={errors.notes}
          >
            {({ id, invalid, describedBy }) => (
              <TextArea
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                value={values.notes}
                onChange={(v) => setField("notes", v)}
              />
            )}
          </FormField>
        </div>
      </RecordSection>

      <RecordSection title="Planting preparation" defaultOpen>
        <div className={stack}>
          {plantingChecks.map(([key, label, info]) => (
            <FormField
              key={key}
              group
              inline
              label={label}
              info={info}
              error={errors[key]}
            >
              {({ labelId }) => (
                <SegmentedChoice
                  size="sm"
                  labelledBy={labelId}
                  options={yesNoOptions}
                  value={values[key]}
                  onChange={(v) => setField(key, v)}
                />
              )}
            </FormField>
          ))}
        </div>
      </RecordSection>

      <RecordSection title="Tree details" defaultOpen>
        <div className={stack}>
          <FormField label="Species" info={g.species} error={errors.species}>
            {({ id, invalid, describedBy }) => (
              <SpeciesPicker
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                value={
                  values.species
                    ? {
                        species: values.species,
                        scientificName: values.scientificName ?? "",
                      }
                    : null
                }
                onChange={(choice) =>
                  setFields({
                    species: choice?.species ?? null,
                    scientificName: choice?.scientificName ?? null,
                  })
                }
              />
            )}
          </FormField>
          <FormField label="Cultivar" info={g.cultivar} error={errors.cultivar}>
            {({ id, invalid, describedBy }) => (
              <TextInput
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                placeholder="e.g. Red Sunset"
                value={values.cultivar}
                onChange={(v) => setField("cultivar", v)}
              />
            )}
          </FormField>
        </div>
      </RecordSection>

      <RecordSection title={photoTitle} defaultOpen>
        <RecordFormPhotos
          photos={values.photos}
          onChange={(photos) => setField("photos", photos)}
        />
      </RecordSection>

      <RecordSection title="Event & planting details" defaultOpen>
        <div className={stack}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Event" info={g.event} error={errors.event}>
              {({ id, invalid, describedBy }) => (
                <SelectInput
                  id={id}
                  invalid={invalid}
                  describedBy={describedBy}
                  value={values.event}
                  options={eventOptions}
                  onChange={(v) => setField("event", v)}
                />
              )}
            </FormField>
            <FormField label="Event Year" info={g.eventYear} error={errors.year}>
              {({ id, invalid, describedBy }) => (
                <SelectInput
                  id={id}
                  invalid={invalid}
                  describedBy={describedBy}
                  value={values.year}
                  options={years}
                  onChange={(v) => setField("year", v)}
                />
              )}
            </FormField>
          </div>
          <FormField
            label="Tree Toga number"
            info={g.treeTogaNumber}
            error={errors.treeTogaNumber}
          >
            {({ id, invalid, describedBy }) => (
              <TextInput
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                inputMode="numeric"
                value={values.treeTogaNumber}
                onChange={(v) =>
                  setField("treeTogaNumber", v.replace(/\D/g, ""))
                }
              />
            )}
          </FormField>
          <FormField
            label="Planting date"
            info={g.plantingDate}
            error={errors.plantingDate}
          >
            {({ id, invalid, describedBy }) => (
              <DateInput
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                value={values.plantingDate}
                onChange={(v) => setField("plantingDate", v)}
              />
            )}
          </FormField>
          <FormField
            label="Planted by"
            info={g.plantedBy}
            error={errors.plantedBy}
          >
            {({ id, invalid, describedBy }) => (
              <TextInput
                id={id}
                invalid={invalid}
                describedBy={describedBy}
                placeholder="e.g. Sustainable Saratoga"
                value={values.plantedBy}
                onChange={(v) => setField("plantedBy", v)}
              />
            )}
          </FormField>
        </div>
      </RecordSection>

      {record && <RecordInformation record={record} />}
    </div>
  );
}