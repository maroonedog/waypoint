import { useState, type ReactElement } from "react";
import {
  Field,
  useParticipation,
  FormProvider,
  useCreateForm,
  useFieldValue,
  useForm,
  useFormStatus,
} from "@maroonedog/waypoint/react";
import { applicationAdapter } from "./waypoint-forms.js";
import { EMPTY_APPLICATION } from "./schema.js";
import { AddressFields } from "./sections/address-fields.js";
import { ItemsSection } from "./sections/items-section.js";
import { MdTextField } from "./md/text-field.js";
import { MdNumberField } from "./md/number-field.js";
import { MdCheckboxField } from "./md/checkbox-field.js";
import { MdChoiceChips } from "./md/choice-chips.js";
import { MdButton } from "./md/button.js";
import { SectionCard } from "./md/section-card.js";

function ApplicantSection(): ReactElement {
  return (
    <SectionCard
      icon="badge"
      title="Who to contact"
      caption="How we reach you about this account"
      sourceId="applicant"
    >
      <Field path="application:applicant.lastName">
        {(field) => <MdTextField field={field} label="Last name" />}
      </Field>
      <Field path="application:applicant.firstName">
        {(field) => <MdTextField field={field} label="First name" />}
      </Field>
      <Field path="application:applicant.birthDate">
        {(field) => <MdTextField field={field} label="Date of birth" type="date" />}
      </Field>
      <Field path="application:applicant.phone">
        {(field) => (
          <MdTextField field={field} label="Phone" leading="call" hint="e.g. (212) 555-0184" />
        )}
      </Field>
      <div className="sm:col-span-2">
        <Field path="application:applicant.email">
          {(field) => (
            <MdTextField field={field} label="Email" type="email" leading="mail" />
          )}
        </Field>
      </div>
    </SectionCard>
  );
}

function CompanySection(): ReactElement {
  return (
    <SectionCard icon="apartment" title="The company" sourceId="company">
      <div className="sm:col-span-2">
        <Field path="application:company.name">
          {(field) => <MdTextField field={field} label="Company name" />}
        </Field>
      </div>
      <Field path="application:company.department">
        {(field) => <MdTextField field={field} label="Department" hint="optional" />}
      </Field>
      <Field path="application:company.title">
        {(field) => <MdTextField field={field} label="Job title" hint="optional" />}
      </Field>
      <Field path="application:company.employees">
        {(field) => <MdNumberField field={field} label="Employees" suffix="people" />}
      </Field>
      <Field path="application:company.registration">
        {(field) => (
          <MdTextField field={field} label="Registration no." hint="e.g. NY-004512" />
        )}
      </Field>
    </SectionCard>
  );
}

function AddressSections(): ReactElement {
  const form = useForm();
  const sameAsBilling = useFieldValue("application:sameAsBilling") === true;
  // The values stay in the store either way; what stops is the verdict
  // counting toward whether the form can be submitted.
  useParticipation(form, "application:shipping", !sameAsBilling);
  return (
    <>
      <SectionCard icon="receipt_long" title="Billing address" sourceId="billing">
        <AddressFields at="application:billing" />
      </SectionCard>

      <SectionCard
        icon="local_shipping"
        title="Shipping address"
        sourceId="shipping"
        caption={
          sameAsBilling
            ? "Same as billing. The values you typed are still here; only the verdict has stopped counting"
            : undefined
        }
        actions={
          <div className="w-40">
            <Field path="application:sameAsBilling">
              {(field) => (
                <MdCheckboxField field={field} label="Same as billing" />
              )}
            </Field>
          </div>
        }
      >
        {/* The values stay in the store either way; what stops is the verdict
            counting toward whether the form can be submitted. */}
        {sameAsBilling ? null : <AddressFields at="application:shipping" />}
      </SectionCard>
    </>
  );
}

function TermsSection(): ReactElement {
  return (
    <SectionCard icon="gavel" title="Payment and terms" sourceId="terms">
      <div className="sm:col-span-2">
        <Field path="application:payment">
          {(field) => (
            <MdChoiceChips
              field={field}
              label="How you would like to pay"
              labels={{
                invoice: "Invoice",
                card: "Credit card",
                transfer: "Bank transfer",
              }}
            />
          )}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field path="application:note">
          {(field) => (
            <MdTextField
              field={field}
              label="Anything else"
              multiline
              hint="optional / up to 500 characters"
            />
          )}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field path="application:agreed">
          {(field) => (
            <MdCheckboxField
              field={field}
              label="I accept the terms of service and the privacy policy"
            />
          )}
        </Field>
      </div>
    </SectionCard>
  );
}

function SubmitBar({
  onSubmitted,
}: {
  onSubmitted: (root: unknown) => void;
}): ReactElement {
  const form = useForm();
  const { errorCount, isSubmitting, submitCount } = useFormStatus();
  const [blocked, setBlocked] = useState<readonly string[]>([]);

  return (
    <div className="sticky bottom-0 z-10 -mx-1 mt-2 rounded-lg bg-surface-high/95 p-4 shadow-e2 backdrop-blur">
      {blocked.length === 0 ? null : (
        <p className="mb-3 rounded-sm bg-error-container px-4 py-3 text-sm text-on-error-container">
          {blocked.length} field(s) are missing or wrong:{" "}
          {blocked.slice(0, 4).join(" / ")}
          {blocked.length > 4 ? " and more" : ""}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          {errorCount === 0
            ? "Ready to send"
            : `${errorCount} field(s) still need a look`}
          {submitCount === 0 ? "" : ` · sent ${submitCount} time(s)`}
        </p>
        <div className="flex gap-2">
          <MdButton tone="text" onClick={() => form.reset()}>
            Discard
          </MdButton>
          <MdButton
            icon="send"
            disabled={isSubmitting}
            onClick={() => {
              void form
                .submit((root) => {
                  onSubmitted(root);
                })
                .then((outcome) => {
                  setBlocked(
                    outcome.submitted
                      ? []
                      : outcome.blockedBy.map((issue) => issue.path)
                  );
                });
            }}
          >
            {isSubmitting ? "Sending…" : "Send the application"}
          </MdButton>
        </div>
      </div>
    </div>
  );
}

export function ApplicationForm({
  onSubmitted,
}: {
  onSubmitted: (root: unknown) => void;
}): ReactElement {
  const form = useCreateForm(() => ({
    adapter: applicationAdapter,
    // The form names ITSELF, rather than the provider naming it: two places
    // to say one thing are two that can disagree, and the disagreement is
    // arranged one level above the paths it would break. Said here, every
    // `application:` path below is checked against it.
    key: "application",
    defaultValues: structuredClone(EMPTY_APPLICATION),
  }));

  return (
    <FormProvider form={form}>
      <div className="grid gap-4">
        <ApplicantSection />
        <CompanySection />
        <AddressSections />
        <ItemsSection />
        <TermsSection />
        <SubmitBar onSubmitted={onSubmitted} />
      </div>
    </FormProvider>
  );
}
