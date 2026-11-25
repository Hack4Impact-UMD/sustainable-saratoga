export type RecordInformationValue = {
  lastEditedAt: string | null;
  lastEditedBy: string | null;
  createdAt: string | null;
  createdBy: string | null;
  recordId: string;
};

export const EMPTY_RECORD_INFORMATION: RecordInformationValue = {
  lastEditedAt: null,
  lastEditedBy: null,
  createdAt: null,
  createdBy: null,
  recordId: "",
};