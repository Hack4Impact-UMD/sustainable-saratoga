import { useId, useState } from "react";
import { CircleAlert, Send, UserPlus, X } from "lucide-react";

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
  | "already-invited";
type InviteEmail = {
  address: string;
  issue?: EmailIssue;
};

const emailAddressPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEmailIssueCopy(issue: EmailIssue, email: string) {
  switch (issue) {
    case "invalid-format":
      return {
        title: "Not a valid email address",
        description: `Check "${email}" for typos. It should look like name@example.org.`,
      };
    case "already-member":
      return {
        title: "Already a member",
        description: "This person already has access to Tree Tracker.",
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
  }
}

export function InviteModal() {
  const emailDescriptionId = useId();
  const [emails, setEmails] = useState<InviteEmail[]>([]);
  const [emailDraft, setEmailDraft] = useState("");
  const [selectedRole, setSelectedRole] = useState<"Volunteer" | "Admin">(
    "Volunteer",
  );
  const canSendInvites =
    emails.length > 0 &&
    emails.every(({ address }) => emailAddressPattern.test(address));
  const sendInviteLabel = `Send ${emails.length} ${
    selectedRole === "Admin" ? "Admin " : ""
  }invite${emails.length === 1 ? "" : "s"}`;

  function addEmails(values: string[]) {
    setEmails((currentEmails) => {
      const knownEmails = new Set(
        currentEmails.map(({ address }) => address.toLowerCase()),
      );
      const newEmails = values
        .map((email) => email.trim())
        .flatMap((address) => {
          const normalizedEmail = address.toLowerCase();
          if (!address || knownEmails.has(normalizedEmail)) return [];
          knownEmails.add(normalizedEmail);

          // TODO: Populate member/invitation status issues after invite API integration.
          const issue = emailAddressPattern.test(address)
            ? undefined
            : "invalid-format";
          const chip: InviteEmail = { address };
          if (issue) chip.issue = issue;
          return [chip];
        });

      return [...currentEmails, ...newEmails];
    });
  }

  function commitEmailText(value: string) {
    addEmails(value.split(/[,\s]+/).filter(Boolean));
    setEmailDraft("");
  }

  return (
    <div className="flex justify-end">
      <Dialog>
        <DialogTrigger
          render={
            <Button
              variant="secondary"
              className="h-touch gap-2 rounded-pill px-4"
            />
          }
        >
          <UserPlus aria-hidden="true" />
          Invite
        </DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100%-2rem)] max-w-[432px] gap-6 rounded-lg border-0 bg-surface p-7 shadow-2 sm:p-7"
        >
          <DialogHeader className="flex-row items-center justify-between gap-4">
            <DialogTitle className="type-h2">Invite members</DialogTitle>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  aria-label="Close invite members dialog"
                  className="size-touch shrink-0"
                />
              }
            >
              <X className="size-5" aria-hidden="true" />
            </DialogClose>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="invite-emails"
                className="type-body-strong font-bold"
              >
                Email addresses
              </Label>
              <div className="flex max-h-[180px] min-h-16 flex-wrap items-center gap-2 overflow-y-auto overscroll-contain rounded-input border border-line-strong bg-surface px-3 py-2 focus-within:border-focus focus-within:ring-3 focus-within:ring-ring/50">
                {emails.map(({ address, issue }) => {
                  const tooltipId = `${emailDescriptionId}-${encodeURIComponent(address)}`;
                  const issueCopy = issue
                    ? getEmailIssueCopy(issue, address)
                    : undefined;
                  const removeEmail = () =>
                    setEmails((currentEmails) =>
                      currentEmails.filter(
                        (currentEmail) =>
                          currentEmail.address.toLowerCase() !==
                          address.toLowerCase(),
                      ),
                    );

                  return (
                    <Badge
                      key={address.toLowerCase()}
                      className={`h-auto min-h-touch max-w-full gap-1 rounded-pill py-0 pl-4 text-body ${
                        issue
                          ? "border-[1.5px] border-[--error] bg-error-tint text-error"
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
                                aria-describedby={tooltipId}
                                aria-label={`Invalid email address: ${address}`}
                                className="flex min-w-0 items-center gap-2 rounded-pill bg-transparent p-0 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
                            className="!flex !w-[min(18rem,calc(100vw-2rem))] !max-w-none !flex-col !items-start !gap-1 !rounded-md !bg-heading !px-3 !py-2 !text-left !text-on-primary shadow-2"
                          >
                            <strong className="type-body-strong block text-on-primary">
                              {issueCopy.title}
                            </strong>
                            <span className="type-body block text-on-primary">
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
                  placeholder="name@example.org, ..."
                  value={emailDraft}
                  className="h-10 min-w-32 flex-1 border-0 bg-transparent px-1 py-0 type-body text-primary placeholder:text-body-muted focus-visible:border-0 focus-visible:ring-0"
                  onChange={(event) => setEmailDraft(event.target.value)}
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
                      setEmails((currentEmails) => currentEmails.slice(0, -1));
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
                className="type-body-strong font-bold"
              >
                Role
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => {
                  if (value === "Volunteer" || value === "Admin") {
                    setSelectedRole(value);
                  }
                }}
              >
                <SelectTrigger
                  id="invite-role"
                  className="!min-h-[64px] w-full !rounded-input border-line-strong !bg-surface px-4 type-body"
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
                  >
                    Volunteer
                  </SelectItem>
                  <SelectItem
                    value="Admin"
                    description="Everything a Volunteer can do, plus manage people, fields and picklists, and delete records."
                  >
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogDescription className="type-body-sm text-body-muted">
              Invite links work for 7 days. Everyone in this send gets the same
              role.
            </DialogDescription>
          </div>

          <Button
            type="button"
            disabled={!canSendInvites}
            className={`h-14 w-full gap-3 type-body-strong ${
              canSendInvites
                ? "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed"
                : "bg-disabled-fill text-disabled opacity-100 hover:bg-disabled-fill"
            }`}
          >
            <Send
              aria-hidden="true"
              className={`size-5 ${
                canSendInvites ? "!text-on-primary" : "!text-disabled"
              }`}
            />
            {sendInviteLabel}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
