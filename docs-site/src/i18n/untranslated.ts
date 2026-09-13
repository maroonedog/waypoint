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
      "6セクション・23入力の取引口座申込フォームが、そのページの上で実際に動いています。ラベルも、数値の範囲も、input の type も、aria 属性も、すべて zod のスキーマから出ていて、手で書いたものは1つもありません。",
      "空のまま送信すると、画面の外にあるものも含めて、止めているパスが名前で出ます。同じ住所を2つ入れると、触っていないほうのフィールドに指摘が出ます。",
    ],
  },
  {
    slug: "validation",
    route: "/validation/",
    title: "バリデーション",
    about: [
      "変更が確定するたびに、ルート全体が判定されます。だから2つのフィールドにまたがるルールが「動いていないほう」に向けて報告できますし、誰も描いていないフィールドが submit を止められます。",
      "その代わりに何を払っているのか、つまり1回のパスで何パスぶん判定しているのかも、同じページに数字で出しています。",
    ],
  },
  {
    slug: "runtime",
    route: "/runtime/",
    title: "ランタイム",
    about: [
      "値は React の外にあります。パスをキーにした平らなセル空間に置かれていて、セルは `createForm` の時点で全部そろうので、コンポーネントのマウントは購読するだけです。",
      "ページ上のフォームには行ごとのレンダー回数が出ていて、ランタイムが書いたセルが1件ずつテープに流れます。1打鍵で何が起きるかを、読むのではなく見られます。",
    ],
  },
  {
    slug: "paths",
    route: "/paths/",
    title: "型付きパス",
    about: [
      "「form:billing.postcode」という文字列がどうやって型として検査されるのか、なぜ props ではなくレジストリなのか、そしてそれがコンパイラにどれだけ負担をかけるのか。",
      "インスタンス化回数は実測値です。「型が速い」という主張ではなく、いくらかかるのかという数字を置いてあります。",
    ],
  },
  {
    slug: "contract",
    route: "/contract/",
    title: "コントラクト",
    about: [
      "このライブラリがバリデータに求めるのは2つだけです。値を判定すること、そしてフィールドが何を受け付けるかを書き出せること。",
      "Standard Schema とその JSON Schema メンバーがちょうどその2つに対応しているので、zod 固有のコードはリゾルバ1本に閉じ込めてあります。",
    ],
  },
  {
    slug: "api",
    route: "/api/",
    title: "API",
    about: [
      "フック・コンポーネント・型の一覧です。シグネチャは、パッケージが実際に出力しているものをそのまま載せています。",
      "読み物ではなく引くためのページなので、翻訳の優先度は下げました。名前もシグネチャも、どちらの言語でも同じものです。",
    ],
  },
  {
    slug: "examples",
    route: "/examples/",
    title: "サンプル",
    about: [
      "サンプルアプリケーションが6本あり、うち4本はこのサイトの上で動いています。サーバエラーの往復、1画面に2つのフォーム、ウィザード、そしてショーケースです。",
      "残る2本はコマンドのままです。このサイトが入れていないライブラリ（zustand、react-hook-form、Formik、TanStack Form）を使うためで、その理由もページに書いてあります。",
    ],
  },
  {
    slug: "benchmark",
    route: "/benchmark/",
    title: "ベンチマーク",
    about: [
      "4つのシナリオすべてで waypoint は負けています。ページは、その負けを自分の表より先に書いています。",
      "計数レーンの整数は CI で固定してあり、増えても減っても、1つ動けば CI が落ちます。",
    ],
  },
];
