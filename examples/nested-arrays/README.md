# 配列とネストが混ざったフォーム — 4実装

```bash
npm run example:nested-arrays  # http://localhost:5181
```

`shipments[] → address{} → lines[]`。配列の中にオブジェクトがあり、その中にまた配列がある。
**同じ zod スキーマ・同じ見た目・同じ操作**を waypoint / react-hook-form / Formik /
TanStack Form の4つで書いています。違うのは**フィールドの指し方だけ**です。

4実装とも実際に動かして確認済みです: 初期表示（各9入力・2カード・3明細行）、
最深部のリーフ `shipments[0].lines[0].sku` を空にするとその行にだけエラーが出ること、
内側配列の追加・削除で残った行が自分の値を保つこと。

---

## 実測

| | コード行 | `shipments` の出現 | 内側配列のために別コンポーネントが要るか |
|---|---|---|---|
| waypoint | **91** | **7** | いいえ |
| react-hook-form | 94 | 10 | **はい（強制）** |
| Formik | 141 | 13 | いいえ |
| TanStack Form | 132 | 9 | いいえ |

コメント行を除いた行数と、`shipments` という語の出現回数です。後者が「入れ子を何回言い直したか」で、
指し方のコストがそのまま出ます。

---

## 指し方

### waypoint — 行が自分の住所を配る

```tsx
{shipments.rows.map((shipment) => (
  <div key={shipment.key}>
    <Text at={`${shipment.path}.address.postcode`} label="郵便番号" />
    <Lines at={shipment.path} />          {/* 内側は "自分がどこか" を知らない */}
  </div>
))}

function Lines({ at }) {
  const lines = useRows(`${at}.lines`);   // 具体パス。内側という自覚は不要
  ...
}
```

`row.path` は `shipments[0]`。内側のリストは「自分が内側である」ことを知りません。
**入れ子専用の API はありません** — `useRows` は具体パスを取るので、内側は
外側の行が既に配った住所を使うだけです。

### react-hook-form — 内側配列は別コンポーネントが必須

```tsx
function Lines({ at }: { at: number }) {          // ← ライブラリが強制する分割
  const { fields, append, remove } = useFieldArray({
    control, name: `shipments.${at}.lines`,
  });
  ...
  <input {...register(`shipments.${at}.lines.${index}.sku`)} />
  {formState.errors.shipments?.[at]?.lines?.[index]?.sku?.message}
```

`useFieldArray` はフックなのでループ内で呼べず、内側の `name` は外側の添字に依存する。
その添字は map の中でしか分からない。**画面が欲しかった分割ではなく、ライブラリが要求する分割**です
（公式ドキュメントも "nested field array, you will have to use a separate component" と明記）。

エラーは `errors.shipments?.[at]?.lines?.[index]?.sku` と手で降りていきます。
**綴りを間違えても型エラーになりません** — `undefined` になり、「エラー無し」として何も出ません。

### Formik — 分割は不要、その代わり文字列が3回

```tsx
<FieldArray name={`shipments.${index}.lines`}>
  ...
  <Field name={`shipments.${index}.lines.${at}.sku`} />
  {message(getIn(errors, `shipments.${index}.lines.${at}.sku`))}
```

`<FieldArray>` は render prop なのでインラインで書け、コンポーネント分割は強制されません。
代わりに**同じパスを2回書きます**（`Field` に1回、`getIn` に1回）。2つが一致しているか確かめるものは何もありません。

さらに2つ、この形だけが払うコストがあります:

- **`validationSchema` が使えません。** `prepareDataForValidation` が検証前に `""` を全部 `undefined`
  に書き換えるので、正当に空の zod フィールドに `expected string, received undefined` が生えます。
  なので `validate` を手書きし、**zod の issue パスを Formik が読む入れ子の形に組み直しています** —
  各セグメントで配列を作るかオブジェクトを作るかを自分で判断する必要があり、間違えても例外は出ず、
  誰も読まないエラーが出来上がるだけです。
- **`getIn` をコンテナに使うと子のエラー配列が返ります。** これをそのまま描画すると
  `Objects are not valid as a React child` で画面ごと落ちます（この実装で実際に踏みました）。
  文字列かどうかで守っています。

### TanStack Form — スキーマはそのまま、指し方は文字列

```tsx
<form.Field name={`shipments[${index}].lines`} mode="array">
  {(lines) => lines.state.value.map((_line, at) => (
    <form.Field name={`shipments[${index}].lines[${at}].sku`}>
      {(field) => <input value={field.state.value} ... />}
```

スキーマは Standard Schema としてそのまま渡せます（このリポジトリが拡張しようとしている契約と同じものを
TanStack も受けるので、アダプタが要りません）。`form.Field` はコンポーネントなので map の中に書け、
分割は強制されません。フィールドの状態とエラーが render prop に一緒に来るので、
**エラーオブジェクトを手で降りる必要がない**のが RHF との差です。

`mode="array"` はリストに必須です。付けないと行内の1編集でリスト全体が再レンダリングされます。

---

## 何が言えて、何が言えないか

言えるのは**指し方のコスト**だけです。この4ファイルは性能を測っていません
（それは `bench/` の仕事で、CI で計測した結果が `docs/measurements-forms-time.md` にあります）。

行数も「少ない方が良い」と単純には言えません。Formik が長いのは主に
zod ブリッジを手書きしている分で、yup を使えば短くなります。**ただしそれは
「バリデータを選べる」という前提を捨てた場合の話**で、このリポジトリはまさにそこを問題にしています。

waypoint が有利に見える点は正直に一つに絞れます: **内側の配列が「自分が内側である」ことを
知らなくて済む**。他の3つはいずれも、内側のフィールドが外側の添字を知っている必要があります。
