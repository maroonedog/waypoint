import { useState } from "react";
import { FormProvider, useCreateForm, useField, useRows, type FormPathTo } from "@maroonedog/waypoint/react";
import { orderAdapter, orderDefaults } from "./order-form.js";
import { useRenderCount } from "./use-render-count.js";

type Locale = "en" | "ja";
type Experiment = "field" | "validation" | "rows";

function LabField({ at, label, locale }: { at: FormPathTo<string>; label: string; locale: Locale }) {
  const field = useField(at, {
    messageFor: (issue) => locale === "ja"
      ? issue.code === "custom" ? "請求先の郵便番号と揃えてみてください。"
      : issue.code === "too_small" ? at === "form:owner.name" ? "3文字以上で入力してください。" : "入力してください。"
      : undefined : undefined,
  });
  const renders = useRenderCount();
  return (
    <div className="lab-field">
      <div className="lab-field-heading">
        <label {...field.labelProps}>{label}</label>
        <span key={renders} className="lab-render">{renders} renders</span>
      </div>
      <input {...field.inputProps} autoComplete="off" />
      <div className="lab-field-note">
        <code>{at}</code>
        <span {...field.errorProps}>{field.issues[0]?.message}</span>
      </div>
    </div>
  );
}

function LabRows({ locale }: { locale: Locale }) {
  const items = useRows("form:items");
  return (
    <div className="lab-rows">
      {items.rows.map((row) => (
        <div className="lab-row" key={row.key}>
          <LabField at={`${row.path}.sku`} label={`${locale === "ja" ? "アイテム" : "Item"} ${row.index + 1}`} locale={locale} />
          <button className="lab-remove" type="button" aria-label={`${locale === "ja" ? "削除：アイテム" : "Remove item"} ${row.index + 1}`} onClick={() => items.remove(row.index)}>×</button>
        </div>
      ))}
      <button className="lab-add" type="button" onClick={() => items.insert(items.rows.length, { sku: `NEW-${items.rows.length + 1}` })}>
        + {locale === "ja" ? "アイテムを追加" : "Add an item"}
      </button>
    </div>
  );
}

const source = {
  field: 'const name = useField("form:owner.name");\n\n<input {...name.inputProps} />',
  validation: 'const shipping = useField("form:shipping.postcode");\n\n<span {...shipping.errorProps}>\n  {shipping.issues[0]?.message}\n</span>',
  rows: 'const items = useRows("form:items");\n\nitems.insert(items.rows.length, { sku: "NEW" });',
};

export default function FormLab({ locale = "en" }: { locale?: Locale }) {
  const [experiment, setExperiment] = useState<Experiment>("field");
  const form = useCreateForm(() => ({ adapter: orderAdapter, defaultValues: structuredClone(orderDefaults) }));
  const japanese = locale === "ja";
  const experiments: { id: Experiment; label: string }[] = [
    { id: "field", label: japanese ? "入力してみる" : "Type something" },
    { id: "validation", label: japanese ? "ルールを試す" : "Try a rule" },
    { id: "rows", label: japanese ? "行を増やす" : "Grow a list" },
  ];
  return (
    <div className="form-lab" data-experiment={experiment}>
      <div className="lab-topbar"><span><i aria-hidden="true" /> WORKBENCH</span><span>{japanese ? "編集してみてください" : "YOURS TO TINKER WITH"}</span></div>
      <div className="lab-tabs" role="group" aria-label={japanese ? "実験を選ぶ" : "Choose an experiment"}>
        <span className="lab-tab-caption">{japanese ? "実験メニュー" : "EXPERIMENTS"}</span>
        {experiments.map(({ id, label }, index) => <button type="button" key={id} aria-pressed={experiment === id} onClick={() => setExperiment(id)}><span className="lab-tab-number">0{index + 1}</span><span>{label}</span><span className="lab-tab-arrow" aria-hidden="true">↗</span></button>)}
        <p className="lab-tab-note">{japanese ? "ひとつずつでも、\n好きな順番でも。" : "One at a time.\nIn any order."}<span aria-hidden="true">✳</span></p>
      </div>
      <div className="lab-workspace">
        <p className="lab-instruction">{experiment === "field"
          ? japanese ? "名前を書き換えて、右のカウンターを見てみよう。" : "Change the name. Watch which render counter moves."
          : experiment === "validation"
          ? japanese ? "請求先だけ変えると、配送先にメッセージが。" : "Change billing. The message appears on shipping."
          : japanese ? "追加して、消して。フィールドがついてきます。" : "Add a row. Remove one. The fields follow along."}</p>
        <FormProvider form={form} partial>
          {experiment === "field" ? <>
            <LabField key="name" at="form:owner.name" label={japanese ? "お名前" : "Your name"} locale={locale} />
            <LabField key="billing" at="form:billing.postcode" label={japanese ? "郵便番号" : "Postcode"} locale={locale} />
          </> : experiment === "validation" ? <>
            <LabField key="billing" at="form:billing.postcode" label={japanese ? "請求先の郵便番号" : "Billing postcode"} locale={locale} />
            <LabField key="shipping" at="form:shipping.postcode" label={japanese ? "配送先の郵便番号" : "Shipping postcode"} locale={locale} />
          </> : <LabRows locale={locale} />}
        </FormProvider>
      </div>
      <div className="lab-source"><span>{japanese ? "使っている API" : "The API behind it"}</span><pre><code>{source[experiment]}</code></pre><p>{japanese ? "フィールドのパスが、そのままコードへの道しるべ。" : "The field's path takes you straight to its code."}</p><span className="lab-source-mark" aria-hidden="true">{'{ }'}</span></div>
      <div className="lab-bottom"><span>{japanese ? "値は実験を切り替えても残ります。" : "Your values stay when you switch experiments."}</span><button type="button" onClick={() => form.reset()}>{japanese ? "最初の状態に戻す ↺" : "Start fresh ↺"}</button></div>
    </div>
  );
}
