// ===========================================================================
// untranslated.ts — the routes that have no Japanese page yet, and what is on
// them.
//
// IT IS A MODULE RATHER THAN A CONST IN THE PAGE because Astro hoists
// `getStaticPaths` out of a page's frontmatter into its own scope: a value
// declared beside it is not in scope when it runs, and the build fails with
// the variable's own name — measured, "PAGES is not defined". An import is in
// scope, so the list lives here.
//
// THE SUMMARIES ARE THE POINT. A reader who switched to Japanese and found no
// Japanese still has a decision to make — is this page worth reading in
// English? — so each route answers that in Japanese, in two or three
// sentences. It is a paragraph of writing for a page of usefulness, and it is
// honest in a way a machine translation of the whole page would not be.
//
// WHEN A PAGE IS TRANSLATED it leaves this list and its route joins
// `TRANSLATED` in Base.astro. Those two edits are one change.
// ===========================================================================

export interface Untranslated {
  /** The `/ja/<slug>/` segment, which is the English route's segment. */
  readonly slug: string;
  /** The English page this one points at. */
  readonly route: string;
  readonly title: string;
  readonly about: readonly string[];
}

export const UNTRANSLATED: readonly Untranslated[] = [
  {
    slug: "showcase",
    route: "/showcase/",
    title: "ショーケース",
    about: [
      "6セクション・23入力の取引口座申込フォームが、そのページの上で実際に動きます。ラベル・数値の範囲・input の type・aria 属性はすべて zod スキーマから来ていて、手で書かれたものは一つもありません。",
      "空のまま送信すると、画面外のものも含めてブロックしているパスが名指しで出ます。同じ住所を2つ入れると、触っていない方のフィールドに苦情が着きます。",
    ],
  },
  {
    slug: "validation",
    route: "/validation/",
    title: "バリデーション",
    about: [
      "確定した変更のたびにルート全体が判定されます。だから2つのフィールドにまたがるルールが「動いていない方」に対して報告でき、誰も描いていないフィールドが submit を止められます。",
      "その代わりに何を払っているのか ― 1回のパスで何パスぶん判定しているのか ― も、同じページに数字で置いてあります。",
    ],
  },
  {
    slug: "runtime",
    route: "/runtime/",
    title: "ランタイム",
    about: [
      "値は React の外側にある、パスをキーにしたフラットなセル空間に住んでいます。セルは `createForm` の時点ですべて書かれているので、コンポーネントのマウントは購読でしかありません。",
      "ページ上のフォームには各行にレンダー回数が出ていて、ランタイムが書いたセルが1件ずつテープに流れます。1打鍵が何を起こすかを、読むのではなく見られます。",
    ],
  },
  {
    slug: "paths",
    route: "/paths/",
    title: "型付きパス",
    about: [
      "「form:billing.postcode」という文字列がどうやって型検査されるのか、レジストリがなぜ prop ではないのか、そしてそれがコンパイラにいくら請求するのか。",
      "インスタンス化回数は実測値です。型が速いという主張ではなく、いくらかかるかという数字が置いてあります。",
    ],
  },
  {
    slug: "contract",
    route: "/contract/",
    title: "コントラクト",
    about: [
      "このライブラリがバリデータに要求するものは2つだけです。値を判定すること、そしてフィールドが何を受け付けるかを記述すること。",
      "Standard Schema とその JSON Schema メンバーがその2つに対応するので、zod 専用のコードはリゾルバ1本に閉じ込められています。",
    ],
  },
  {
    slug: "api",
    route: "/api/",
    title: "API",
    about: [
      "フック・コンポーネント・型の一覧で、署名はパッケージが実際に出力しているものそのままです。",
      "読むためではなく探すためのページなので、翻訳の優先度を下げています。名前と署名はどちらの言語でも同じものです。",
    ],
  },
  {
    slug: "examples",
    route: "/examples/",
    title: "サンプル",
    about: [
      "6本のアプリケーション。うち4本はこのサイトの上で動きます ― サーバエラーの往復、1画面に2つのフォーム、ウィザード、そしてショーケース。",
      "残り2本はコマンドのままです。このサイトが持っていないライブラリ（zustand、react-hook-form、Formik、TanStack Form）を必要とするためで、ページにその理由が書いてあります。",
    ],
  },
  {
    slug: "benchmark",
    route: "/benchmark/",
    title: "ベンチマーク",
    about: [
      "4シナリオすべてで waypoint は負けています。ページはその負けを、自分の表より先に書いています。",
      "計数レーンの整数は CI でゲートされていて、どちらの方向であれ1つ動けば CI が落ちます。",
    ],
  },
];
