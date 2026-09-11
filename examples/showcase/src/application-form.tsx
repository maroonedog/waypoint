import { useState, type ReactElement } from "react";
import {
  Field,
  useParticipation,
  FormProvider,
  useCreateForm,
  useFieldValue,
  useForm,
  useFormStatus,
} from "form-react";
import { zodFormResolver } from "form-contract-resolver-zod";
import { applicationSchema, EMPTY_APPLICATION } from "./schema.js";
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
    <SectionCard icon="badge" title="ご担当者さま" caption="ご連絡先を入力してください">
      <Field path="applicant.lastName">
        {(field) => <MdTextField field={field} label="姓" />}
      </Field>
      <Field path="applicant.firstName">
        {(field) => <MdTextField field={field} label="名" />}
      </Field>
      <Field path="applicant.lastNameKana">
        {(field) => <MdTextField field={field} label="セイ" hint="全角カタカナ" />}
      </Field>
      <Field path="applicant.firstNameKana">
        {(field) => <MdTextField field={field} label="メイ" hint="全角カタカナ" />}
      </Field>
      <Field path="applicant.birthDate">
        {(field) => <MdTextField field={field} label="生年月日" type="date" />}
      </Field>
      <Field path="applicant.phone">
        {(field) => (
          <MdTextField field={field} label="電話番号" leading="call" hint="例: 03-1234-5678" />
        )}
      </Field>
      <div className="sm:col-span-2">
        <Field path="applicant.email">
          {(field) => (
            <MdTextField field={field} label="メールアドレス" type="email" leading="mail" />
          )}
        </Field>
      </div>
    </SectionCard>
  );
}

function CompanySection(): ReactElement {
  return (
    <SectionCard icon="apartment" title="会社情報">
      <div className="sm:col-span-2">
        <Field path="company.name">
          {(field) => <MdTextField field={field} label="会社名" />}
        </Field>
      </div>
      <Field path="company.department">
        {(field) => <MdTextField field={field} label="部署" hint="任意" />}
      </Field>
      <Field path="company.title">
        {(field) => <MdTextField field={field} label="役職" hint="任意" />}
      </Field>
      <Field path="company.employees">
        {(field) => <MdNumberField field={field} label="従業員数" suffix="名" />}
      </Field>
    </SectionCard>
  );
}

function AddressSections(): ReactElement {
  const form = useForm();
  const sameAsBilling = useFieldValue<boolean>("sameAsBilling") === true;
  // The values stay in the store either way; what stops is the verdict
  // counting toward whether the form can be submitted.
  useParticipation(form, "shipping", !sameAsBilling);
  return (
    <>
      <SectionCard icon="receipt_long" title="請求先住所">
        <AddressFields at="billing" />
      </SectionCard>

      <SectionCard
        icon="local_shipping"
        title="配送先住所"
        caption={
          sameAsBilling
            ? "請求先と同じ。入力した値は残ったまま、判定だけ止まっています"
            : undefined
        }
        actions={
          <div className="w-40">
            <Field path="sameAsBilling">
              {(field) => (
                <MdCheckboxField field={field} label="請求先と同じ" />
              )}
            </Field>
          </div>
        }
      >
        {/* The values stay in the store either way; what stops is the verdict
            counting toward whether the form can be submitted. */}
        {sameAsBilling ? null : <AddressFields at="shipping" />}
      </SectionCard>
    </>
  );
}

function TermsSection(): ReactElement {
  return (
    <SectionCard icon="gavel" title="お支払いと確認事項">
      <div className="sm:col-span-2">
        <Field path="payment">
          {(field) => (
            <MdChoiceChips
              field={field}
              label="お支払い方法"
              labels={{
                invoice: "請求書払い",
                card: "クレジットカード",
                transfer: "銀行振込",
              }}
            />
          )}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field path="note">
          {(field) => (
            <MdTextField field={field} label="備考" multiline hint="任意 / 500 文字まで" />
          )}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field path="agreed">
          {(field) => (
            <MdCheckboxField
              field={field}
              label="利用規約およびプライバシーポリシーに同意します"
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
          未入力・不備が {blocked.length} 件あります: {blocked.slice(0, 4).join(" / ")}
          {blocked.length > 4 ? " ほか" : ""}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          {errorCount === 0
            ? "送信できます"
            : `${errorCount} 件の入力を確認してください`}
          {submitCount === 0 ? "" : ` · 送信を ${submitCount} 回試行`}
        </p>
        <div className="flex gap-2">
          <MdButton tone="text" onClick={() => form.reset()}>
            入力を破棄
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
            {isSubmitting ? "送信中…" : "申込を送信"}
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
    adapter: zodFormResolver(applicationSchema),
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
