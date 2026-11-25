import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RecordSection } from "@frontend/components/records/RecordSection.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@frontend/components/ui/dialog.tsx";
import { ContactsSection } from "@frontend/components/records/contacts/ContactsSection.tsx";
import {
  EMPTY_CONTACTS,
  contactsAreValid,
  countFilledContactFields,
} from "@frontend/components/records/contacts/types.ts";
import type { ContactsValue } from "@frontend/components/records/contacts/types.ts";
import { LocationSection } from "@frontend/components/records/location/LocationSection.tsx";
import { SiteAssessmentSection } from "@frontend/components/records/site-assessment/SiteAssessmentSection.tsx";
import {
  EMPTY_SITE_ASSESSMENT,
  countFilledSiteAssessmentFields,
} from "@frontend/components/records/site-assessment/types.ts";
import type { SiteAssessmentValue } from "@frontend/components/records/site-assessment/types.ts";
import {
  EMPTY_LOCATION,
  countFilledLocationFields,
} from "@frontend/components/records/location/types.ts";
import type { LocationValue } from "@frontend/components/records/location/types.ts";
import { trpc } from "@frontend/lib/trpc.ts";
import { PlantingPreparationSection } from "@frontend/components/records/planting-preparation/PlantingPreparationSection.tsx";

import {
  EMPTY_PLANTING_PREPARATION,
  countFilledPlantingPreparationFields,
} from "@frontend/components/records/planting-preparation/types.ts";
import type { PlantingPreparationValue } from "@frontend/components/records/planting-preparation/types.ts";

import { TreeSpeciesSection } from "@frontend/components/records/tree-details/TreeDetailsSection.tsx";
import {
  EMPTY_TREE_SPECIES,
  countFilledTreeSpeciesFields,
} from "@frontend/components/records/tree-details/types.ts";
import type { TreeSpeciesValue } from "@frontend/components/records/tree-details/types.ts";

import { EventPlantingSection } from "@frontend/components/records/event-planting/EventPlantingSection.tsx";
import {
  EMPTY_EVENT_PLANTING,
  countFilledEventPlantingFields,
} from "@frontend/components/records/event-planting/types.ts";
import type { EventPlantingValue } from "@frontend/components/records/event-planting/types.ts";

import { RecordInformationSection } from "@frontend/components/records/record-information/RecordInformationSection.tsx";
import { EMPTY_RECORD_INFORMATION } from "@frontend/components/records/record-information/types.ts";

import { PhotosSection } from "@frontend/components/records/photos/PhotosSection.tsx";
import type { PhotoItem } from "@frontend/components/records/photos/PhotosSection.tsx";

import { ChevronDown, Check, Search, X, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/records/new")({
  component: NewRecordPage,
});

type StartingStatus = "requested" | "possible";

const STARTING_STATUSES: { value: StartingStatus; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "possible", label: "Possible" },
];

const DEFAULT_STARTING_STATUS: StartingStatus = "requested";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function NewRecordPage() {
  const [plantingPreparation, setPlantingPreparation] =
    useState<PlantingPreparationValue>(EMPTY_PLANTING_PREPARATION);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [recordToast, setRecordToast] = useState<"syncing" | "synced" | null>(
    null,
  );
  const [startingStatus, setStartingStatus] = useState<StartingStatus>(
    DEFAULT_STARTING_STATUS,
  );

  const [treeSpecies, setTreeSpecies] =
    useState<TreeSpeciesValue>(EMPTY_TREE_SPECIES);
  const [responsibleOverride, setResponsibleOverride] = useState<string | null>(
    null,
  );
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [contacts, setContacts] = useState<ContactsValue>(EMPTY_CONTACTS);
  const [siteAssessment, setSiteAssessment] = useState<SiteAssessmentValue>(
    EMPTY_SITE_ASSESSMENT,
  );

  const [eventPlanting, setEventPlanting] =
    useState<EventPlantingValue>(EMPTY_EVENT_PLANTING);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const navigate = useNavigate();

  const peopleQuery = useQuery(trpc.people.list.queryOptions());

  const createRecordMutation = useMutation(
    trpc.records.create.mutationOptions({
      onSuccess: (createdRecord) => {
        setRecordToast("syncing");

        setTimeout(() => {
          sessionStorage.setItem("showRecordToast", "true");

          navigate({
            to: "/records/$recordId",
            params: { recordId: createdRecord.id },
          });
        }, 1000);
      },
      onError: (error) => {
        console.error("CREATE RECORD ERROR:", error);
      },
    }),
  );

  const activePeople = (peopleQuery.data ?? []).filter(
    (person) => person.status === "active",
  );
  const selfPerson = activePeople.find((person) => person.isSelf);

  const responsible = responsibleOverride ?? selfPerson?.id ?? "";
  const selectedPerson = activePeople.find(
    (person) => person.id === responsible,
  );
  const filteredPeople = activePeople.filter((person) => {
    const search = memberSearch.toLowerCase();

    return (
      (person.name ?? "").toLowerCase().includes(search) ||
      (person.email ?? "").toLowerCase().includes(search)
    );
  });

  const selectedPersonName =
    selectedPerson?.name || selectedPerson?.email || "Unassigned";

  // Counts fields the person has changed from their defaults.
  const filledCount =
    (startingStatus === DEFAULT_STARTING_STATUS ? 0 : 1) +
    (responsibleOverride !== null && responsibleOverride !== selfPerson?.id
      ? 1
      : 0) +
    countFilledLocationFields(location) +
    countFilledContactFields(contacts) +
    countFilledSiteAssessmentFields(siteAssessment) +
    countFilledPlantingPreparationFields(plantingPreparation) +
    countFilledTreeSpeciesFields(treeSpecies) +
    countFilledEventPlantingFields(eventPlanting) +
    photos.length;

  const canCreate =
    contacts.hostName.trim().length > 0 &&
    contactsAreValid(contacts) &&
    treeSpecies.species.trim().length > 0;

  const missingRequirements = [];

  if (!location.address.trim()) {
    missingRequirements.push("Address is required");
  }

  if (!contacts.hostName.trim()) {
    missingRequirements.push("Host name is required");
  }

  if (!contactsAreValid(contacts)) {
    missingRequirements.push("Check your contact information");
  }

  if (!treeSpecies.species.trim()) {
    missingRequirements.push("Tree species is required");
  }

  function handleCreate() {
    if (!canCreate || createRecordMutation.isPending) return;

    const toYesNo = (value: boolean | null) =>
      value === null ? null : value ? "Yes" : "No";

    const toNumber = (value: string) => {
      const parsed = Number(value);
      return value.trim() && Number.isInteger(parsed) ? parsed : null;
    };

    const plantingYear = eventPlanting.plantingDate
      ? Number(eventPlanting.plantingDate.slice(0, 4))
      : null;

    const pipelineState =
      startingStatus === "possible"
        ? {
            origin: "possible" as const,
            status: "possible" as const,
          }
        : {
            origin: "requested" as const,
            status: "requested" as const,
          };

    const addressParts = location.address
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const address = addressParts[0] ?? "";
    const city = addressParts[1] ?? "";
    const state = addressParts[2] ?? "";

    createRecordMutation.mutate({
      treeNumber: 1,
      treeCount: 1,

      // Temporary values since the map isn't fully implemented
      address,
      city,
      state,
      zip: null,
      lat: location.pin?.lat ?? 0,
      lng: location.pin?.lng ?? 0,

      ...pipelineState,

      species: treeSpecies.species.trim() || null,
      scientificName: null,
      cultivar: treeSpecies.cultivar.trim() || null,
      responsible: selectedPerson?.name || selectedPerson?.email || null,
      latestPhotoDate: null,

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
        overheadUtilities: null,
        undergroundUtilities: null,
        crown: null,
        preparationRequired: siteAssessment.preparationRequired.trim() || null,
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

      healthChecks: [],
      photos: [],

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
        year: toNumber(eventPlanting.eventYear),
        treeTogaNumber: toNumber(eventPlanting.treeTogaNumber),
        plantingDate: eventPlanting.plantingDate || null,
        yearPlanted: plantingYear,
        plantedBy: eventPlanting.plantedBy.trim() || null,
      },
    });
  }

  function handleCancel() {
    if (filledCount === 0) {
      navigate({ to: "/" });
      return;
    }
    setIsLeaveDialogOpen(true);
  }

  return (
    <main className="min-h-dvh w-full bg-surface font-sans">
      {recordToast && (
        <div className="fixed bottom-5 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2">
          <div
            style={{ borderRadius: "28px" }}
            className="flex items-center gap-4 bg-[#292b2b] px-5 py-4 text-white shadow-xl"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border-[3px] border-[#a8d77c] text-[#a8d77c]">
              ✓
            </div>

            <div className="min-w-0 flex-1">
              <p style={{ color: "#ffffff" }} className="text-[16px] font-bold">
                Record created
              </p>

              <p
                style={{
                  color: recordToast === "synced" ? "#a8d77c" : "#d1d5db",
                }}
                className="text-[14px]"
              >
                {recordToast === "syncing" ? "Syncing changes..." : "Synced"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setRecordToast(null)}
              className="shrink-0 px-2 text-2xl text-gray-300"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header: stays pinned to the top while the form scrolls */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-divider bg-surface px-4">
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-11 text-[15px] font-semibold text-body"
        >
          Cancel
        </button>

        <h1 className="text-[18px] font-bold text-heading">New record</h1>

        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate || createRecordMutation.isPending}
          className="flex h-10 items-center justify-center gap-2 rounded-full border border-primary bg-white px-4 text-[15px] font-semibold text-primary disabled:border-divider disabled:bg-divider disabled:text-disabled"
        >
          {createRecordMutation.isPending ? (
            <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            "Create"
          )}
        </button>
      </header>

      <div className="space-y-4 p-4">
        {!canCreate && (
          <div className="rounded-lg bg-red-50 p-1 text-[14px] text-red-700">
            <p className="font-semibold">Cannot create record yet:</p>
            <ul className="list-disc pl-5">
              {missingRequirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[14px] font-normal leading-5 text-body-muted">
          Fields marked <span className="text-error">*</span> are required.
          Everything else can be added later.
        </p>

        {/* Starting status */}
        <section aria-labelledby="starting-status-label" className="space-y-2">
          <h2
            id="starting-status-label"
            className="text-[14px] font-semibold text-heading"
          >
            Starting status <span className="text-error">*</span>
          </h2>

          <div className="grid grid-cols-2 gap-2">
            {STARTING_STATUSES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={startingStatus === value}
                onClick={() => setStartingStatus(value)}
                className={`min-h-11 rounded-md border px-3 text-[15px] font-semibold ${
                  startingStatus === value
                    ? "border-primary bg-primary/10 text-heading"
                    : "border-divider bg-surface text-body"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Responsible member */}
        <div className="space-y-2">
          <p className="block text-[15px] font-semibold text-heading">
            Responsible member
          </p>

          <button
            type="button"
            onClick={() => {
              setMemberPickerOpen(true);
              setMemberSearch("");
            }}
            className="flex min-h-11 w-full items-center justify-between rounded-[8px] border border-divider bg-surface px-3 text-left text-[15px] text-heading"
          >
            <span className="flex min-w-0 items-center gap-3">
              {selectedPerson ? (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#91ad58] text-[11px] font-bold text-white">
                  {getInitials(
                    selectedPerson.name || selectedPerson.email || "Member",
                  )}
                </span>
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-divider text-body">
                  <UserRound className="size-4" />
                </span>
              )}

              <span className="truncate">
                {selectedPerson
                  ? selectedPersonName + (selectedPerson.isSelf ? " (you)" : "")
                  : "Unassigned"}
              </span>
            </span>

            <ChevronDown className="size-5 shrink-0 text-body" />
          </button>

          {peopleQuery.isError && (
            <p role="alert" className="text-[14px] text-error">
              Couldn&apos;t load members. Please try again.
            </p>
          )}
        </div>

        {/* Responsible member bottom sheet */}
        <Dialog open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
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
                  setResponsibleOverride("");
                  setMemberPickerOpen(false);
                }}
                className={`flex min-h-[64px] w-full items-center gap-3 border-b border-[#e0e5df] px-2 text-left ${
                  responsible ? "" : "bg-[#e6f0e4] text-[#174b2b]"
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

                {!responsible && <Check className="size-6 text-[#176638]" />}
              </button>

              {filteredPeople.map((person) => {
                const name = person.name || person.email || "Member";

                const initials = getInitials(name);

                const selected = responsible === person.id;

                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => {
                      setResponsibleOverride(person.id);
                      setMemberPickerOpen(false);
                    }}
                    className={`flex min-h-[64px] w-full items-center gap-3 border-b border-[#e0e5df] px-2 text-left ${
                      selected ? "bg-[#e6f0e4] text-[#174b2b]" : ""
                    }`}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#91ad58] text-[13px] font-bold text-white">
                      {initials}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-medium">
                        {name}
                        {person.isSelf ? " (you)" : ""}
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
        <TreeSpeciesSection value={treeSpecies} onChange={setTreeSpecies} />
      </RecordSection>

      <RecordSection
        title={photos.length > 0 ? `Photos (${photos.length})` : "Photos"}
      >
        <PhotosSection value={photos} onChange={setPhotos} />
      </RecordSection>

      <RecordSection title="Event & planting details">
        <EventPlantingSection
          value={eventPlanting}
          onChange={setEventPlanting}
        />
      </RecordSection>

      <RecordSection title="Record information" dropdown={false}>
        <RecordInformationSection value={EMPTY_RECORD_INFORMATION} />
      </RecordSection>

      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogOverlay className="bg-black/50" />

        <DialogContent
          showCloseButton={false}
          style={{ backgroundColor: "#ffffff", opacity: 1 }}
          className="w-[calc(100%-1rem)] gap-4 rounded-[24px] p-6 shadow-2"
        >
          <DialogHeader className="gap-3 text-left">
            <DialogTitle className="text-[18px] font-bold text-[#292929]">
              Leave this new record?
            </DialogTitle>

            <DialogDescription className="text-[15px] font-normal text-[#4b5563]">
              You&apos;ve filled in {filledCount}{" "}
              {filledCount === 1 ? "field" : "fields"}. If you leave now, this
              record won&apos;t be saved.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setIsLeaveDialogOpen(false)}
              style={{ backgroundColor: "#176638", color: "#ffffff" }}
              className="h-12 w-full rounded-full text-[15px] font-semibold hover:bg-[#12532d]"
            >
              Keep editing
            </button>

            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              style={{ color: "#a83232" }}
              className="h-10 w-full text-[15px] font-semibold hover:underline"
            >
              Discard record
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
