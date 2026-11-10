import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/records/$recordId")({
  component: RecordPage,
});

function RecordPage() {
  return null;
}
