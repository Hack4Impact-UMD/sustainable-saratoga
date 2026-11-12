import { Send, UserPlus, X } from "lucide-react";

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

export function InviteModal() {
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
              <Label htmlFor="invite-emails" className="type-body-strong font-bold">
                Email addresses
              </Label>
              <Input
                id="invite-emails"
                type="text"
                autoComplete="email"
                placeholder="name@example.org, ..."
                className="h-16 rounded-input px-4 type-body text-primary placeholder:text-body-muted"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-role" className="type-body-strong font-bold">
                Role
              </Label>
              <Select defaultValue="Volunteer">
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
            disabled
            className="h-14 w-full gap-3 bg-disabled-fill type-body-strong text-disabled opacity-100 hover:bg-disabled-fill"
          >
            <Send aria-hidden="true" />
            Send invites
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
