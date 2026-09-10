import { z } from "zod";
const s = z.object({
  name: z.string().min(3).max(20),
  age: z.number().min(18),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
  bio: z.string().optional(),
});
console.log("def.type:", s._zod?.def?.type ?? s.def?.type);
const shape = s._zod?.def?.shape ?? s.def?.shape;
for (const [k, v] of Object.entries(shape)) {
  const d = v._zod?.def ?? v.def;
  console.log(k, "=> type:", d.type, "| checks:", JSON.stringify((d.checks ?? []).map(c => (c._zod?.def ?? c.def ?? c))).slice(0,240));
}
