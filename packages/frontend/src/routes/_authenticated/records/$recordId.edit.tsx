
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { TreeRecord } from "@repo/common";
import {
  ChevronDown,
  Check,
  Search,
  X,
  UserRound,
  MapPin,
} from "lucide-react";
import { trpc } from "@frontend/lib/trpc.ts";
import { RecordSection } from "@frontend/components/records/RecordSection.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@frontend/components/ui/dialog.tsx";

import { LocationSection } from "@frontend/components/records/location/LocationSection.tsx";
import {
  EMPTY_LOCATION,
  type LocationValue,
} from "@frontend/components/records/location/types.ts";

import { ContactsSection } from "@frontend/components/records/contacts/ContactsSection.tsx";
import {
  contactsAreValid,
  type ContactsValue,
} from "@frontend/components/records/contacts/types.ts";

import { SiteAssessmentSection } from "@frontend/components/records/site-assessment/SiteAssessmentSection.tsx";
import {
  EMPTY_SITE_ASSESSMENT,
  type SiteAssessmentValue,
} from "@frontend/components/records/site-assessment/types.ts";

import { PlantingPreparationSection } from "@frontend/components/records/planting-preparation/PlantingPreparationSection.tsx";
import {
  EMPTY_PLANTING_PREPARATION,
  type PlantingPreparationValue,
} from "@frontend/components/records/planting-preparation/types.ts";

import { TreeSpeciesSection } from "@frontend/components/records/tree-details/TreeDetailsSection.tsx";
import type { TreeSpeciesValue } from "@frontend/components/records/tree-details/types.ts";

import { EventPlantingSection } from "@frontend/components/records/event-planting/EventPlantingSection.tsx";
import type { EventPlantingValue } from "@frontend/components/records/event-planting/types.ts";

import { RecordInformationSection } from "@frontend/components/records/record-information/RecordInformationSection.tsx";

export const Route = createFileRoute(
  "/_authenticated/records/$recordId/edit",
)({
  component: EditRecordPage,
});

function yesNo(value: string | null): boolean | null {
  if (value?.toLowerCase() === "yes") return true;
  if (value?.toLowerCase() === "no") return false;
  return null;
}

function toYesNo(value: boolean | null): string | null {
  return value === null ? null : value ? "Yes" : "No";
}

function numberOrNull(value: string): number | null {
  const parsed = Number(value);
  return value.trim() && Number.isInteger(parsed) ? parsed : null;
}

function EditRecordPage() {
  const { recordId } = Route.useParams();

  const recordQuery = useQuery(
    trpc.records.getById.queryOptions({ id: recordId }),
  );

  if (recordQuery.isPending) {
    return <main className="min-h-dvh w-full bg-surface">Loading record...</main>;
  }

  if (recordQuery.isError) {
    return (
      <main className="min-h-dvh bg-surface p-4">
        <p role="alert" className="text-error">
          Couldn't load this record. Please try again.
        </p>
      </main>
    );
  }

  if (!recordQuery.data) {
    return (
      <main className="min-h-dvh w-full bg-surface px-6 py-6">
        <p role="alert">Record not found.</p>
      </main>
    );
  }

  return <EditRecordForm record={recordQuery.data} />;
}

function EditRecordForm({ record }: { record: TreeRecord }) {
  const navigate = useNavigate();
  const peopleQuery = useQuery(trpc.people.list.queryOptions());
  const [status, setStatus] = useState(record.status);
  const [statusOpen, setStatusOpen] = useState(false);

  const [responsibleOverride, setResponsibleOverride] = useState("");
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const activePeople = (peopleQuery.data ?? []).filter(
    (person) => person.status === "active",
  );

  const initialLocation: LocationValue = {
    ...EMPTY_LOCATION,
    address: [record.address, record.city, record.state]
      .filter(Boolean)
      .join(", "),
    pin:
      record.lat !== 0 || record.lng !== 0
        ? { lat: record.lat, lng: record.lng }
        : null,
    description: record.location.description ?? "",
    ownership:
      record.location.ownership?.toLowerCase().includes("dpw")
        ? "dpw"
        : record.location.ownership?.toLowerCase().includes("private")
          ? "private"
          : "",
  };

  const initialContacts: ContactsValue = {
    hostName: record.contacts.treeHost ?? "",
    email: record.contacts.email ?? "",
    phone: record.contacts.phone ?? "",
    propertyOwner:
      record.contacts.propertyOwner === "Same as host"
        ? "host"
        : record.contacts.propertyOwner === "Other"
          ? "other"
          : "",
  };

  const savedWireConflict = record.siteAssessment.wireConflict ?? "";

  const initialSiteAssessment: SiteAssessmentValue = {
    ...EMPTY_SITE_ASSESSMENT,
    rowSpaceFt: record.siteAssessment.treeLawnRowSpace ?? "",
    placement:
      record.siteAssessment.ifNotInRow === "front-yard" ||
      record.siteAssessment.ifNotInRow === "side-yard" ||
      record.siteAssessment.ifNotInRow === "back-yard" ||
      record.siteAssessment.ifNotInRow === "not-applicable"
        ? record.siteAssessment.ifNotInRow
        : "",
    exposure: (
      ["N", "NE", "E", "SE", "S", "SW", "W", "NW"].includes(
        record.siteAssessment.energyDirection ?? "",
      )
        ? record.siteAssessment.energyDirection
        : ({
            North: "N",
            Northeast: "NE",
            East: "E",
            Southeast: "SE",
            South: "S",
            Southwest: "SW",
            West: "W",
            Northwest: "NW",
          } as Record<string, string>)[
            record.siteAssessment.energyDirection ?? ""
          ]
    ) as SiteAssessmentValue["exposure"],
    wireConflict:
      savedWireConflict === "none" ||
      savedWireConflict === "clear-as-it-matures" ||
      savedWireConflict === "conflict"
        ? savedWireConflict
        : savedWireConflict.toLowerCase().includes("clear")
          ? "clear-as-it-matures"
          : savedWireConflict
            ? "other"
            : "",
    wireConflictOther:
      savedWireConflict &&
      !["none", "clear-as-it-matures", "conflict"].includes(savedWireConflict)
        ? savedWireConflict
        : "",
    preparationRequired: record.siteAssessment.preparationRequired ?? "",
    notes: record.siteAssessment.notes ?? "",
  };

  const initialPlantingPreparation: PlantingPreparationValue = {
    ...EMPTY_PLANTING_PREPARATION,
    spotFlagged: yesNo(record.plantingPreparation.spotFlagged),
    readyToPlant: yesNo(record.plantingPreparation.readyToPlant),
    comingSoonSign: yesNo(record.plantingPreparation.comingSoonSign),
    utilityMarked: yesNo(record.plantingPreparation.utilityMarked),
    roots: record.plantingPreparation.roots ?? "",
    needToPlant: record.plantingPreparation.needToPlant ?? "",
    notes: record.plantingPreparation.notes ?? "",
  };

  const initialTreeSpecies: TreeSpeciesValue = {
    species: record.species ?? "",
    cultivar: record.cultivar ?? "",
  };

  const initialEventPlanting: EventPlantingValue = {
    event: record.eventPlantingDetails.event ?? "",
    eventYear: record.eventPlantingDetails.year?.toString() ?? "",
    treeTogaNumber:
      record.eventPlantingDetails.treeTogaNumber?.toString() ?? "",
    plantingDate: record.eventPlantingDetails.plantingDate ?? "",
    plantedBy: record.eventPlantingDetails.plantedBy ?? "",
  };

  const [location, setLocation] = useState(initialLocation);
  const [contacts, setContacts] = useState(initialContacts);
  const [siteAssessment, setSiteAssessment] = useState(initialSiteAssessment);
  const [plantingPreparation, setPlantingPreparation] = useState(
    initialPlantingPreparation,
  );
  const [treeSpecies, setTreeSpecies] = useState(initialTreeSpecies);
  const [eventPlanting, setEventPlanting] = useState(initialEventPlanting);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

  const originalValues = {
    location: initialLocation,
    contacts: initialContacts,
    siteAssessment: initialSiteAssessment,
    plantingPreparation: initialPlantingPreparation,
    treeSpecies: initialTreeSpecies,
    eventPlanting: initialEventPlanting,
    responsible: record.responsible ?? "",
    status: record.status
  };

  const selectedPerson = activePeople.find(
  (person) => person.id === responsibleOverride,
);

const availableStatuses = [
  ...(record.origin === "requested"
    ? [{ value: "requested", label: "Requested", color: "#4285c5" }]
    : []),
  ...(record.origin === "possible"
    ? [{ value: "possible", label: "Possible", color: "#ed8735" }]
    : []),
  { value: "approved", label: "Approved", color: "#9974cf" },
  { value: "planted", label: "Planted", color: "#78ad35" },
] as const;

const filteredPeople = activePeople.filter((person) => {
  const search = memberSearch.toLowerCase();

  return (
    (person.name ?? "").toLowerCase().includes(search) ||
    (person.email ?? "").toLowerCase().includes(search)
  );
});

const selectedPersonName =
  selectedPerson?.name ||
  selectedPerson?.email ||
  (responsibleOverride === "__unassigned__"
    ? "Unassigned"
    : record.responsible || "Unassigned");

const currentResponsible =
  responsibleOverride === "__unassigned__"
    ? ""
    : selectedPerson?.name ||
      selectedPerson?.email ||
      record.responsible ||
      "";

const currentValues = {
  location,
  contacts,
  siteAssessment,
  plantingPreparation,
  treeSpecies,
  eventPlanting,
  responsible: currentResponsible,
  status
};

  const hasChanges =
    JSON.stringify(currentValues) !== JSON.stringify(originalValues);

  const canSave =
    hasChanges &&
    contacts.hostName.trim().length > 0 &&
    contactsAreValid(contacts) &&
    treeSpecies.species.trim().length > 0;

  const updateMutation = useMutation(
    trpc.records.update.mutationOptions({
      onSuccess: () => {
        navigate({
          to: "/records/$recordId",
          params: { recordId: record.id },
        });
      },
    }),
  );

  function handleSave() {
    if (!canSave || updateMutation.isPending) return;

    const addressParts = location.address
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const address = addressParts[0] ?? record.address;
    const city = addressParts[1] ?? record.city;
    const state = addressParts[2] ?? record.state;

    const pipelineState =
  record.origin === "possible"
    ? {
        origin: "possible" as const,
        status: status as "possible" | "approved" | "planted",
      }
    : {
        origin: "requested" as const,
        status: status as "requested" | "approved" | "planted",
      };
    updateMutation.mutate({
      id: record.id,
      ...pipelineState,

      address,
      city,
      state,
      zip: record.zip,
      lat: location.pin?.lat ?? record.lat,
      lng: location.pin?.lng ?? record.lng,

      treeNumber: record.treeNumber,
      treeCount: record.treeCount,
      species: treeSpecies.species.trim() || null,
      scientificName: record.scientificName,
      cultivar: treeSpecies.cultivar.trim() || null,
      responsible: currentValues.responsible || null,
      latestPhotoDate: record.latestPhotoDate,

      location: {
        ownership:
          location.ownership === "dpw"
            ? "DPW-controlled location"
            : location.ownership === "private"
              ? "Private"
              : null,
        description: location.description.trim() || null,
      },

      siteAssessment: {
        energyDirection: siteAssessment.exposure || null,
        wireConflict:
          siteAssessment.wireConflict === "other"
            ? siteAssessment.wireConflictOther.trim() || "Other"
            : siteAssessment.wireConflict || null,
        treeLawnRowSpace: siteAssessment.rowSpaceFt.trim() || null,
        ifNotInRow: siteAssessment.placement || null,
        overheadUtilities: record.siteAssessment.overheadUtilities,
        undergroundUtilities: record.siteAssessment.undergroundUtilities,
        crown: record.siteAssessment.crown,
        preparationRequired:
          siteAssessment.preparationRequired.trim() || null,
        notes: siteAssessment.notes.trim() || null,
      },

      plantingPreparation: {
        spotFlagged: toYesNo(plantingPreparation.spotFlagged),
        readyToPlant: toYesNo(plantingPreparation.readyToPlant),
        comingSoonSign: toYesNo(plantingPreparation.comingSoonSign),
        utilityMarked: toYesNo(plantingPreparation.utilityMarked),
        roots: plantingPreparation.roots.trim() || null,
        needToPlant: plantingPreparation.needToPlant.trim() || null,
        notes: plantingPreparation.notes.trim() || null,
      },

      photos: record.photos,
      healthChecks: record.healthChecks,

      contacts: {
        treeHost: contacts.hostName.trim() || null,
        propertyOwner:
          contacts.propertyOwner === "host"
            ? "Same as host"
            : contacts.propertyOwner === "other"
              ? "Other"
              : null,
        email: contacts.email.trim() || null,
        phone: contacts.phone.trim() || null,
      },

      eventPlantingDetails: {
        event: eventPlanting.event.trim() || null,
        year: numberOrNull(eventPlanting.eventYear),
        treeTogaNumber: numberOrNull(eventPlanting.treeTogaNumber),
        plantingDate: eventPlanting.plantingDate || null,
        yearPlanted: eventPlanting.plantingDate
          ? Number(eventPlanting.plantingDate.slice(0, 4))
          : record.eventPlantingDetails.yearPlanted,
        plantedBy: eventPlanting.plantedBy.trim() || null,
      },
    });
  }

  function handleCancel() {
    if (!hasChanges) {
      navigate({
        to: "/records/$recordId",
        params: { recordId: record.id },
      });
      return;
    }

    setIsLeaveDialogOpen(true);
  }

  function discardChanges() {
    navigate({
      to: "/records/$recordId",
      params: { recordId: record.id },
    });
  }

  return (
    <main className="min-h-dvh w-full bg-surface px-6 py-6">
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-divider bg-surface px-6">
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-11 text-[15px] font-semibold text-body"
        >
          Cancel
        </button>

        <h1 className="text-[18px] font-bold text-heading">Edit record</h1>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || updateMutation.isPending}
          className="h-10 rounded-full border border-primary bg-white px-4 text-[15px] font-semibold text-primary disabled:border-divider disabled:bg-divider disabled:text-disabled"
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </button>
      </header>

      
<div className="bg-white">
  {/* Status & assignment heading */}
  <div className="flex h-[68px] items-center border-y border-[#e0e5df] bg-[#f2f3f0] px-4">
    <h2 className="text-[20px] font-bold text-[#292929]">
      Status &amp; assignment
    </h2>
  </div>

  <div className="space-y-5 px-4 py-5">
    {/* Status */}
    
<div className="space-y-2">
  <label className="flex items-center gap-2 text-[15px] font-semibold text-heading">
    Status <span className="text-error">*</span>

    <span
      title="The current status of this tree record"
      className="flex size-5 items-center justify-center rounded-full border-2 border-icon-primary text-[12px] font-bold text-icon-primary"
    >
      i
    </span>
  </label>

  <div className="relative">
    <button
      type="button"
      aria-expanded={statusOpen}
      onClick={() => {
        setStatusOpen((open) => !open);
        setMemberPickerOpen(false);
      }}
      className="flex min-h-11 w-full items-center justify-between rounded-[8px] border border-divider bg-surface px-3 text-left text-[15px] text-heading"
    >
      <span>
        {availableStatuses.find((item) => item.value === status)?.label}
      </span>

      <ChevronDown
        className={`size-5 transition-transform ${
          statusOpen ? "rotate-180" : ""
        }`}
      />
    </button>

    {statusOpen && (
      <>
        <button
          type="button"
          aria-label="Close status options"
          className="fixed inset-0 z-30 cursor-default bg-transparent"
          onClick={() => setStatusOpen(false)}
        />

        <div
          style={{ backgroundColor: "#ffffff", opacity: 1 }}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 rounded-xl border border-divider bg-white p-2 shadow-lg"
        >
          {availableStatuses.map((option) => {
            const selected = status === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setStatus(option.value as typeof status);
                  setStatusOpen(false);
                }}
                className={`flex min-h-11 w-full items-center gap-3 rounded-md border px-3 text-left text-[15px] ${
                  selected
                    ? "border-primary bg-primary/10 font-semibold text-heading"
                    : "border-transparent bg-white text-body"
                }`}
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: option.color,
                    color: option.color,
                  }}
                >
                  <MapPin className="size-4 fill-current" />
                </span>

                <span className="flex-1">{option.label}</span>

                {selected && (
                  <Check className="size-5 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </>
    )}
  </div>
</div>


    {/* Responsible member */}
    
<div className="space-y-2">
  <label className="block text-[15px] font-semibold text-heading">
    Responsible member
  </label>

  <button
    type="button"
    onClick={() => {
      setMemberPickerOpen(true);
      setStatusOpen(false);
      setMemberSearch("");
    }}
    className="flex min-h-11 w-full items-center justify-between rounded-[8px] border border-divider bg-surface px-3 text-left text-[15px] text-heading"
  >
    <span className="flex min-w-0 items-center gap-3">
      {responsibleOverride === "__unassigned__" ||
      !currentResponsible ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-divider text-body">
          <UserRound className="size-4" />
        </span>
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#91ad58] text-[11px] font-bold text-white">
          {selectedPersonName
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
      )}

      <span className="truncate">{selectedPersonName}</span>
    </span>

    <ChevronDown className="size-5 shrink-0 text-body" />
  </button>
</div>

  </div>

  {/* Responsible member bottom sheet */}
  <Dialog
    open={memberPickerOpen}
    onOpenChange={setMemberPickerOpen}
  >
    <DialogOverlay className="bg-black/50" />

    <DialogContent
      showCloseButton={false}
      style={{
        backgroundColor: "#ffffff",
        opacity: 1,
      }}
      className="fixed inset-x-0 bottom-0 top-auto flex max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-[24px] border border-divider bg-white p-0 shadow-xl sm:bottom-0 sm:top-auto sm:max-w-none sm:translate-x-0 sm:translate-y-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 pt-6">
        <DialogTitle className="font-serif text-[23px] font-bold text-[#292929]">
          Responsible member
        </DialogTitle>

        <button
          type="button"
          onClick={() => setMemberPickerOpen(false)}
          aria-label="Close member picker"
          className="rounded-full p-1 text-[#536057]"
        >
          <X className="size-7" />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="flex min-h-[54px] items-center gap-3 rounded-full border-2 border-[#176638] px-5">
          <Search className="size-6 shrink-0 text-[#536057]" />

          <input
            autoFocus
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            placeholder="Search members"
            className="w-full bg-transparent text-[16px] text-[#292929] outline-none placeholder:text-[#858585]"
          />
        </div>
      </div>

      {/* Members */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        {/* Unassigned */}
        <button
          type="button"
          onClick={() => {
            setResponsibleOverride("__unassigned__");
            setMemberPickerOpen(false);
          }}
          className={`flex min-h-[64px] w-full items-center gap-3 border-b border-[#e0e5df] px-2 text-left ${
            responsibleOverride === "__unassigned__"
              ? "bg-[#e6f0e4] text-[#174b2b]"
              : ""
          }`}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#cbd3c9] text-[#536057]">
            <UserRound className="size-5" />
          </span>

          <span className="flex-1">
            <span className="block text-[16px] font-medium">
              Unassigned
            </span>
            <span className="block text-[14px] text-[#536057]">
              No responsible member
            </span>
          </span>

          {responsibleOverride === "__unassigned__" && (
            <Check className="size-6 text-[#176638]" />
          )}
        </button>

        {filteredPeople.map((person) => {
          const name = person.name || person.email || "Member";
          const initials = name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          const selected =
            responsibleOverride === person.id ||
            (!responsibleOverride &&
              record.responsible === name);

          return (
            <button
              key={person.id}
              type="button"
              onClick={() => {
                setResponsibleOverride(person.id);
                setMemberPickerOpen(false);
              }}
              className={`flex min-h-[64px] w-full items-center gap-3 border-b border-[#e0e5df] px-2 text-left ${
                selected
                  ? "bg-[#e6f0e4] text-[#174b2b]"
                  : ""
              }`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#91ad58] text-[13px] font-bold text-white">
                {initials}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-medium">
                  {name}
                </span>
                <span className="block truncate text-[14px] text-[#536057]">
                  {person.role || "Volunteer"}
                </span>
              </span>

              {selected && (
                <Check className="size-6 shrink-0 text-[#176638]" />
              )}
            </button>
          );
        })}

        {filteredPeople.length === 0 && (
          <p className="py-8 text-center text-[14px] text-[#777f78]">
            No members found.
          </p>
        )}
      </div>
    </DialogContent>
  </Dialog>
</div>


      <RecordSection title="Location" defaultOpen>
        <LocationSection value={location} onChange={setLocation} />
      </RecordSection>

      <RecordSection title="Contacts">
        <ContactsSection value={contacts} onChange={setContacts} />
      </RecordSection>

      <RecordSection title="Site assessment">
        <SiteAssessmentSection
          value={siteAssessment}
          onChange={setSiteAssessment}
        />
      </RecordSection>

      <RecordSection title="Planting preparation">
        <PlantingPreparationSection
          value={plantingPreparation}
          onChange={setPlantingPreparation}
        />
      </RecordSection>

      <RecordSection title="Tree details">
        <TreeSpeciesSection
          value={treeSpecies}
          onChange={setTreeSpecies}
        />
      </RecordSection>

      <RecordSection title={`Photos (${record.photos.length})`}>
        <p className="p-4 text-[14px] text-body-muted">
          Photos
        </p>
      </RecordSection>

      <RecordSection title="Event & planting details">
        <EventPlantingSection
          value={eventPlanting}
          onChange={setEventPlanting}
        />
      </RecordSection>

      <RecordSection title="Record information" dropdown={false}>
        <RecordInformationSection
          value={{
            recordId: record.id,
            createdAt: record.recordInformation.createdAt,
            createdBy: record.recordInformation.createdBy,
            lastEditedAt: record.recordInformation.lastEditedAt,
            lastEditedBy: record.recordInformation.lastEditedBy,
          }}
        />
      </RecordSection>

      {updateMutation.isError && (
        <p role="alert" className="p-4 text-[14px] text-error">
          Couldn't save your changes. Please try again.
        </p>
      )}

      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogOverlay className="bg-black/50" />
        <DialogContent
          showCloseButton={false}
          style={{ backgroundColor: "#ffffff", opacity: 1 }}
          className="w-[calc(100%-1rem)] gap-4 rounded-2xl p-6 shadow-2"
        >
          <DialogHeader className="gap-3 text-left">
            <DialogTitle className="text-[18px] font-bold text-[#292929]">
              Discard your changes?
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[#4b5563]">
              Your changes haven't been saved. Are you sure you want to leave?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setIsLeaveDialogOpen(false)}
              style={{ backgroundColor: "#176638", color: "#ffffff" }}
              className="h-12 w-full rounded-full text-[15px] font-semibold"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={discardChanges}
              style={{ color: "#a83232" }}
              className="h-10 w-full text-[15px] font-semibold hover:underline"
            >
              Discard changes
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
