import { useId, useState } from "react";
import { CircleAlert, RefreshCw, Send, UserPlus, X } from "lucide-react";
import type { Person } from "@repo/common";

import { Badge } from "@frontend/components/ui/badge.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@frontend/components/ui/dialog.tsx";
import { Input } from "@frontend/components/ui/input.tsx";
import { Label } from "@frontend/components/ui/label.tsx";
import { Spinner } from "@frontend/components/ui/spinner.tsx";
import { notify } from "@frontend/lib/notify.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@frontend/components/ui/tooltip.tsx";

type EmailIssue =
  | "invalid-format"
  | "already-member"
  | "expired-invite"
  | "already-invited"
  | "rejected";
type InviteEmail = {
  address: string;
  issue?: EmailIssue;
  /** Who the address belongs to, or the server's reason for "rejected". */
  detail?: string;
};
type SendError = "offline" | "failed" | "rejected";

const emailAddressPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A function, so TypeScript doesn't assume it stays the same across an await.
const isOffline = () => navigator.onLine === false;

export type SendInvitesInput = {
  emails: string[];
  role: "volunteer" | "admin";
};

/** The invites.send result: all addresses are invited, or none are. */
export type SendInvitesResult =
  | { ok: true; count: number }
  | { ok: false; failures: { email: string; reason: string }[] };

interface InviteModalProps {
  /** Current members and invites, so their addresses are flagged up front. */
  people?: Person[];
  sendInvites: (input: SendInvitesInput) => Promise<SendInvitesResult>;
}

const sendErrorCopy: Record<SendError, { title: string; message: string }> = {
  offline: {
    title: "You’re offline",
    message: "Connect to Wi-Fi or mobile data and try again. Nothing was sent.",
  },
  failed: {
    title: "Couldn’t send the invites",
    message: "Check your connection and try again. Nothing was sent.",
  },
  rejected: {
    title: "Couldn’t send the invites",
    message: "Check the highlighted addresses and try again. Nothing was sent.",
  },
};

/** Flags an address that is malformed or already on the People list. */
function findIssue(
  address: string,
  people: Person[],
): Pick<InviteEmail, "issue" | "detail"> {
  if (!emailAddressPattern.test(address)) return { issue: "invalid-format" };
  const match = people.find(
    (person) => person.email.toLowerCase() === address.toLowerCase(),
  );
  if (!match) return {};
  if (match.status === "active") {
    return { issue: "already-member", detail: match.name || undefined };
  }
  return {
    issue: match.status === "expired" ? "expired-invite" : "already-invited",
  };
}

function canInviteAsAdmin(emails: InviteEmail[]) {
  return (
    emails.length > 0 &&
    emails.every(
      ({ address }) =>
        emailAddressPattern.test(address) &&
        address.toLowerCase().endsWith("@sustainablesaratoga.org"),
    )
  );
}

function getEmailIssueCopy(issue: EmailIssue, email: string, detail?: string) {
  switch (issue) {
    case "invalid-format":
      return {
        title: "Not a valid email address",
        description: `Check "${email}" for typos. It should look like name@example.org.`,
      };
    case "already-member":
      return {
        title: "Already a member",
        description: `${detail ?? "This person"} already has access to Tree Tracker.`,
      };
    case "expired-invite":
      return {
        title: "Invite expired",
        description: "Use Resend invite in the list to send them a new link.",
      };
    case "already-invited":
      return {
        title: "Already invited",
        description:
          "Their invite is still pending. Use Resend invite in the list if they need a new link.",
      };
    case "rejected":
      return {
        title: "Couldn’t invite this address",
        description: detail ?? "Remove it and try again.",
      };
  }
}

export function InviteModal({ people = [], sendInvites }: InviteModalProps) {
  const emailDescriptionId = useId();
  const [emails, setEmails] = useState<InviteEmail[]>([]);
  const [emailDraft, setEmailDraft] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<SendError | null>(null);
  const [selectedRole, setSelectedRole] = useState<"Volunteer" | "Admin">(
    "Volunteer",
  );
  // A server rejection doesn't block a retry; the other issues need fixing first.
  const canSendInvites =
    emails.length > 0 &&
    emails.every(({ issue }) => !issue || issue === "rejected");
  const canSelectAdmin = canInviteAsAdmin(emails);
  const activeRole =
    selectedRole === "Admin" && canSelectAdmin ? selectedRole : "Volunteer";
  const sendInviteLabel = `Send ${emails.length} ${
    activeRole === "Admin" ? "Admin " : ""
  }invite${emails.length === 1 ? "" : "s"}`;

  function updateEmails(nextEmails: InviteEmail[]) {
    setEmails(nextEmails);
    if (!canInviteAsAdmin(nextEmails)) {
      setSelectedRole("Volunteer");
    }
  }

  function addEmails(values: string[]) {
    const knownEmails = new Set(
      emails.map(({ address }) => address.toLowerCase()),
    );
    const newEmails = values
      .map((email) => email.trim())
      .flatMap((address) => {
        const normalizedEmail = address.toLowerCase();
        if (!address || knownEmails.has(normalizedEmail)) return [];
        knownEmails.add(normalizedEmail);

        return [{ address, ...findIssue(address, people) }];
      });

    updateEmails([...emails, ...newEmails]);
  }

  function commitEmailText(value: string) {
    addEmails(value.split(/[,\s]+/).filter(Boolean));
    setEmailDraft("");
  }

  async function handleSendInvites() {
    if (isSending) return;
    if (isOffline()) {
      setSendError("offline");
      return;
    }

    // Clear earlier server rejections so a retry starts clean.
    const pending = emails.map((email) =>
      email.issue === "rejected" ? { address: email.address } : email,
    );
    setEmails(pending);
    setSendError(null);
    setIsSending(true);
    let result: SendInvitesResult;
    try {
      result = await sendInvites({
        emails: pending.map(({ address }) => address),
        role: activeRole === "Admin" ? "admin" : "volunteer",
      });
    } catch {
      setSendError(isOffline() ? "offline" : "failed");
      return;
    } finally {
      setIsSending(false);
    }

    if (!result.ok) {
      const reasons = new Map(
        result.failures.map(({ email, reason }) => [
          email.trim().toLowerCase(),
          reason,
        ]),
      );
      const marked = pending.map((email) => {
        const reason = reasons.get(email.address.toLowerCase());
        return reason
          ? {
              address: email.address,
              issue: "rejected" as const,
              detail: reason,
            }
          : email;
      });
      setEmails(marked);
      setSendError(
        marked.some(({ issue }) => issue === "rejected")
          ? "rejected"
          : "failed",
      );
      return;
    }

    setIsOpen(false);
    setEmails([]);
    setEmailDraft("");
    setSelectedRole("Volunteer");
    setSendError(null);
    notify(
      "success",
      `${result.count} invite${result.count === 1 ? "" : "s"} sent`,
    );
  }

  return (
    <div className="flex justify-end">
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!isSending) setIsOpen(open);
        }}
      >
        <DialogTrigger
          render={
            <Button
              variant="secondary"
              disabled={isSending}
              className="h-touch gap-2 rounded-pill px-4"
            />
          }
        >
          <UserPlus aria-hidden="true" />
          Invite
        </DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className="min-w-0 w-[calc(100%-2rem)] max-w-[432px] gap-6 rounded-lg border-0 bg-surface p-7 shadow-2 sm:p-7"
        >
          <DialogHeader className="flex-row items-center justify-between gap-4">
            <DialogTitle className="type-h2">Invite members</DialogTitle>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  aria-label="Close invite members dialog"
                  disabled={isSending}
                  className="size-touch shrink-0"
                />
              }
            >
              <X className="size-5" aria-hidden="true" />
            </DialogClose>
          </DialogHeader>

          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="invite-emails"
                className={`type-body-strong font-bold ${
                  isSending ? "text-disabled" : ""
                }`}
              >
                Email addresses
              </Label>
              <div
                className={`flex w-full min-w-0 max-h-[180px] min-h-16 flex-wrap items-center gap-2 overflow-y-auto overscroll-contain rounded-input border border-line-strong px-3 py-2 focus-within:border-focus focus-within:ring-3 focus-within:ring-ring/50 ${
                  isSending ? "bg-disabled-fill" : "bg-surface"
                }`}
              >
                {emails.map(({ address, issue, detail }) => {
                  const tooltipId = `${emailDescriptionId}-${encodeURIComponent(address)}`;
                  const issueCopy = issue
                    ? getEmailIssueCopy(issue, address, detail)
                    : undefined;
                  const removeEmail = () =>
                    updateEmails(
                      emails.filter(
                        (currentEmail) =>
                          currentEmail.address.toLowerCase() !==
                          address.toLowerCase(),
                      ),
                    );

                  return (
                    <Badge
                      key={address.toLowerCase()}
                      className={`h-auto min-w-0 min-h-touch max-w-full shrink whitespace-normal gap-1 rounded-pill py-0 pl-4 text-body ${
                        isSending
                          ? "border-line bg-pressed opacity-50"
                          : issue
                            ? "border-[1.5px] border-error bg-error-tint text-error"
                            : "border-line bg-pressed"
                      }`}
                    >
                      {issueCopy ? (
                        <Tooltip>
                          <TooltipTrigger
                            delay={0}
                            render={
                              <button
                                type="button"
                                disabled={isSending}
                                aria-describedby={tooltipId}
                                aria-label={`${
                                  issue === "invalid-format"
                                    ? "Invalid email address"
                                    : issueCopy.title
                                }: ${address}`}
                                className="flex min-w-0 max-w-full items-center gap-2 rounded-pill bg-transparent p-0 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                              />
                            }
                          >
                            <CircleAlert
                              className="!size-4 shrink-0 text-error"
                              aria-hidden="true"
                            />
                            <span className="break-all">{address}</span>
                          </TooltipTrigger>
                          <TooltipContent
                            id={`${tooltipId}-popup`}
                            role="tooltip"
                            side="bottom"
                            sideOffset={4}
                            className="!flex !w-[min(18rem,calc(100vw-2rem))] !min-w-0 !max-w-none !flex-col !items-start !gap-1 !rounded-md !bg-heading !px-3 !py-2 !text-left !text-on-primary shadow-2"
                          >
                            <strong className="type-body-strong block text-on-primary">
                              {issueCopy.title}
                            </strong>
                            <span className="type-body block min-w-0 max-w-full break-words text-on-primary">
                              {issueCopy.description}
                            </span>
                          </TooltipContent>
                          <span id={tooltipId} className="sr-only">
                            {issueCopy.title}. {issueCopy.description}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="break-all">{address}</span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Remove ${address}`}
                        disabled={isSending}
                        className="size-touch shrink-0 rounded-full"
                        onClick={removeEmail}
                      >
                        <X
                          className={`size-5 ${issue ? "!text-error" : "!text-icon-primary"}`}
                          aria-hidden="true"
                        />
                      </Button>
                    </Badge>
                  );
                })}
                <Input
                  id="invite-emails"
                  type="text"
                  autoComplete="email"
                  aria-label="Email addresses"
                  disabled={isSending}
                  placeholder={
                    emails.length === 0 && !emailDraft
                      ? "name@example.org, ..."
                      : undefined
                  }
                  value={emailDraft}
                  className="h-10 min-w-32 flex-1 border-0 bg-transparent px-1 py-0 type-body text-primary placeholder:text-body-muted focus-visible:border-0 focus-visible:ring-0 disabled:text-disabled disabled:opacity-100"
                  onChange={(event) => setEmailDraft(event.target.value)}
                  onBlur={() => commitEmailText(emailDraft)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === "," ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      commitEmailText(emailDraft);
                    } else if (
                      event.key === "Backspace" &&
                      !emailDraft &&
                      emails.length > 0
                    ) {
                      updateEmails(emails.slice(0, -1));
                    }
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    commitEmailText(event.clipboardData.getData("text"));
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="invite-role"
                className={`type-body-strong font-bold ${
                  isSending ? "text-disabled" : ""
                }`}
              >
                Role
              </Label>
              <Select
                value={activeRole}
                disabled={isSending}
                onValueChange={(value) => {
                  if (value === "Volunteer") {
                    setSelectedRole(value);
                  } else if (value === "Admin" && canSelectAdmin) {
                    setSelectedRole(value);
                  }
                }}
              >
                <SelectTrigger
                  id="invite-role"
                  disabled={isSending}
                  className={`!min-h-[64px] w-full !rounded-input border-line-strong px-4 type-body disabled:opacity-100 ${
                    isSending
                      ? "!bg-disabled-fill !text-disabled"
                      : "!bg-surface"
                  }`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  alignItemWithTrigger={false}
                  sideOffset={12}
                  className="rounded-md bg-surface p-0 shadow-2"
                >
                  <SelectItem
                    value="Volunteer"
                    description="Can view and edit all tree records, including contact info, photos and locations."
                    className="cursor-pointer"
                  >
                    Volunteer
                  </SelectItem>
                  <SelectItem
                    value="Admin"
                    disabled={!canSelectAdmin}
                    description="Everything a Volunteer can do, plus manage people, fields and picklists, and delete records."
                    className="cursor-pointer"
                  >
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sendError ? (
              <div
                role="alert"
                className="flex gap-3 rounded-md border border-line-error bg-error-tint p-3"
              >
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-error"
                />
                <div className="flex flex-col gap-1">
                  <p className="type-body-strong text-error">
                    {sendErrorCopy[sendError].title}
                  </p>
                  <p className="type-body-sm">
                    {sendErrorCopy[sendError].message}
                  </p>
                </div>
              </div>
            ) : (
              <DialogDescription className="type-body-sm text-body-muted">
                Invite links work for 7 days. Everyone in this send gets the
                same role.
              </DialogDescription>
            )}
          </div>

          <Button
            type="button"
            disabled={!canSendInvites}
            aria-disabled={isSending || undefined}
            aria-busy={isSending}
            aria-label={isSending ? "Sending..." : undefined}
            onClick={handleSendInvites}
            className={`h-14 w-full gap-3 type-body-strong ${
              isSending
                ? "bg-primary-pressed text-on-primary hover:bg-primary-pressed active:bg-primary-pressed"
                : canSendInvites
                  ? "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed"
                  : "bg-disabled-fill text-disabled opacity-100 hover:bg-disabled-fill"
            }`}
          >
            {isSending ? (
              <>
                <Spinner aria-label="Sending invitations" />
                Sending...
              </>
            ) : sendError ? (
              <>
                <RefreshCw aria-hidden="true" className="size-5" />
                Try again
              </>
            ) : (
              <>
                <Send
                  aria-hidden="true"
                  className={`size-5 ${
                    canSendInvites ? "!text-on-primary" : "!text-disabled"
                  }`}
                />
                {sendInviteLabel}
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
