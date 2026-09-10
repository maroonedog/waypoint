import { z } from "zod";
import { PREFECTURES } from "./prefectures.js";

const KANA = /^[ァ-ヶー\s]+$/;
const PHONE = /^0\d{1,4}-?\d{1,4}-?\d{3,4}$/;
const POSTCODE = /^\d{3}-?\d{4}$/;

const address = z.object({
  postcode: z.string().regex(POSTCODE, "郵便番号は 100-0001 の形式で入力してください"),
  prefecture: z.enum(PREFECTURES),
  city: z.string().min(1, "市区町村を入力してください").max(40),
  street: z.string().min(1, "番地を入力してください").max(60),
  building: z.string().max(60).optional(),
});

/** The declared limit, stated once so the message and the rule cannot drift. */
export const ORDER_CEILING = 3_000_000;

export const applicationSchema = z
  .object({
    applicant: z.object({
      lastName: z.string().min(1, "姓を入力してください").max(20),
      firstName: z.string().min(1, "名を入力してください").max(20),
      lastNameKana: z.string().regex(KANA, "全角カタカナで入力してください"),
      firstNameKana: z.string().regex(KANA, "全角カタカナで入力してください"),
      birthDate: z.string().min(1, "生年月日を入力してください"),
      email: z.email("メールアドレスの形式が正しくありません"),
      phone: z.string().regex(PHONE, "電話番号は 03-1234-5678 の形式で入力してください"),
    }),
    company: z.object({
      name: z.string().min(1, "会社名を入力してください").max(60),
      department: z.string().max(40).optional(),
      title: z.string().max(40).optional(),
      employees: z.number().min(1, "1 以上を入力してください").max(1_000_000),
    }),
    billing: address,
    shipping: address,
    sameAsBilling: z.boolean(),
    items: z.array(
      z.object({
        sku: z.string().min(1, "商品コードを入力してください").max(20),
        name: z.string().min(1, "品名を入力してください").max(60),
        quantity: z.number().min(1, "1 以上を入力してください").max(999),
        unitPrice: z.number().min(0, "0 以上を入力してください").max(9_999_999),
      })
    ),
    payment: z.enum(["invoice", "card", "transfer"]),
    note: z.string().max(500).optional(),
    agreed: z.boolean(),
  })
  .superRefine((value, ctx) => {
    // A rule that reports against a field OTHER than the one that moved.
    if (value.agreed !== true) {
      ctx.addIssue({
        code: "custom",
        path: ["agreed"],
        message: "利用規約への同意が必要です",
      });
    }
    if (value.items.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "明細を 1 行以上追加してください",
      });
    }
    const total = value.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    if (total > ORDER_CEILING) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: `合計 ${total.toLocaleString("ja-JP")} 円が上限 ${ORDER_CEILING.toLocaleString("ja-JP")} 円を超えています`,
      });
    }
    // The shipping address is judged against billing, and the toggle that
    // hides it does not change what the rule reads.
    if (
      value.sameAsBilling !== true &&
      value.shipping.postcode === value.billing.postcode &&
      value.shipping.street === value.billing.street
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["shipping", "postcode"],
        message: "請求先と同じ住所です。同一で良い場合は上のスイッチを入れてください",
      });
    }
  });

export const EMPTY_APPLICATION = {
  applicant: {
    lastName: "",
    firstName: "",
    lastNameKana: "",
    firstNameKana: "",
    birthDate: "",
    email: "",
    phone: "",
  },
  company: { name: "", department: "", title: "", employees: 1 },
  billing: { postcode: "", prefecture: "東京都", city: "", street: "", building: "" },
  shipping: { postcode: "", prefecture: "東京都", city: "", street: "", building: "" },
  sameAsBilling: true,
  items: [{ sku: "", name: "", quantity: 1, unitPrice: 0 }],
  payment: "invoice",
  note: "",
  agreed: false,
};
