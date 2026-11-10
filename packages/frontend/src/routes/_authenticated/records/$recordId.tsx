import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/records/$recordId")({
  component: RecordPage,
});

function RecordPage() {
  return null;
}
