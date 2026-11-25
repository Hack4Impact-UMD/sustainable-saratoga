import { useState } from "react";
import { fieldGuidance as g } from "@frontend/components/records/fieldGuidance.ts";
import { FieldLabel } from "@frontend/components/records/FieldLabel.tsx";
import { isValidEmail } from "@frontend/components/records/contacts/types.tsx";
import type {
  ContactsValue,
  PropertyOwner,
} from "@frontend/components/records/contacts/types.tsx";

type Props = {
  value: ContactsValue;
  onChange: (next: ContactsValue) => void;
  disabled?: boolean;
};

const PROPERTY_OWNER_OPTIONS: { value: PropertyOwner; label: string }[] = [
  { value: "host", label: "Same as host" },
  { value: "other", label: "Someone else" },
];

const INPUT_CLASS =
  "min-h-11 w-full rounded-[8px] border bg-surface px-3 text-[15px] text-heading placeholder:text-body-muted focus:outline-none focus:ring-1 disabled:opacity-60";

/** The Contacts fields of the new-record form. */
export function ContactsSection({ value, onChange, disabled = false }: Props) {
  const [emailTouched, setEmailTouched] = useState(false);

  const showEmailError =
    emailTouched && value.email.trim() !== "" && !isValidEmail(value.email);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <FieldLabel htmlFor="contacts-host-name" required hint={g.treeHost}>
          Tree host name
        </FieldLabel>
        <input
          id="contacts-host-name"
          type="text"
          autoComplete="off"
          value={value.hostName}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, hostName: event.target.value })
          }
          className={`${INPUT_CLASS} border-divider focus:border-primary focus:ring-primary`}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="contacts-email" hint={g.email}>
          Email
        </FieldLabel>
        <input
          id="contacts-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={value.email}
          disabled={disabled}
          aria-invalid={showEmailError}
          aria-describedby={showEmailError ? "contacts-email-error" : undefined}
          onChange={(event) =>
            onChange({ ...value, email: event.target.value })
          }
          onBlur={() => setEmailTouched(true)}
          className={`${INPUT_CLASS} ${
            showEmailError
              ? "border-error focus:border-error focus:ring-error"
              : "border-divider focus:border-primary focus:ring-primary"
          }`}
        />
        {showEmailError && (
          <p
            id="contacts-email-error"
            role="alert"
            className="text-[14px] text-error"
          >
            Enter a valid email address.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="contacts-phone" hint={g.phone}>
          Phone
        </FieldLabel>
        <input
          id="contacts-phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={value.phone}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, phone: event.target.value })
          }
          className={`${INPUT_CLASS} border-divider focus:border-primary focus:ring-primary`}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel id="contacts-property-owner-label" hint={g.propertyOwner}>
          Property owner
        </FieldLabel>
        <div
          role="group"
          aria-labelledby="contacts-property-owner-label"
          className="grid grid-cols-2 gap-2"
        >
          {PROPERTY_OWNER_OPTIONS.map(({ value: option, label }) => (
            <button
              key={option}
              type="button"
              aria-pressed={value.propertyOwner === option}
              disabled={disabled}
              onClick={() => onChange({ ...value, propertyOwner: option })}
              className={`min-h-11 rounded-md border px-3 text-[15px] font-semibold disabled:opacity-60 ${
                value.propertyOwner === option
                  ? "border-primary bg-primary/10 text-heading"
                  : "border-divider bg-surface text-body"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
