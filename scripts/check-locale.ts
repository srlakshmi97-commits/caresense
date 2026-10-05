// Reports keys a locale is missing, extra keys, and {placeholder} mismatches
// compared with en.ts. Usage: npx tsx scripts/check-locale.ts es
import en from "../src/lib/i18n/en";
import { LOCALES } from "../src/lib/i18n";

const code = process.argv[2];
if (!code || !(code in LOCALES)) {
  console.error(`Usage: tsx scripts/check-locale.ts <${Object.keys(LOCALES).join("|")}>`);
  process.exit(1);
}

type Tree = { [k: string]: string | Tree };
const flat = (o: Tree, p = ""): Record<string, string> =>
  Object.entries(o).reduce<Record<string, string>>((a, [k, v]) => (typeof v === "string" ? { ...a, [p + k]: v } : { ...a, ...flat(v, `${p}${k}.`) }), {});
const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

const E = flat(en as Tree);
const L = flat(LOCALES[code].messages as Tree);
const missing = Object.keys(E).filter((k) => !(k in L) && k !== "app.name");
const extra = Object.keys(L).filter((k) => !(k in E));
const mismatched = Object.keys(L).filter((k) => k in E && vars(E[k]) !== vars(L[k]));

console.log(`${code}: ${Object.keys(L).length} of ${Object.keys(E).length} keys`);
console.log("missing:", missing);
console.log("extra:", extra);
console.log("placeholder mismatch:", mismatched);
process.exit(missing.length || extra.length || mismatched.length ? 1 : 0);
