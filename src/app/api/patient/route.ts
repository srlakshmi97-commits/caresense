import { HttpError, readJson, route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { clampStr, isDateOnly, pickEnum, strList } from "@/lib/util";
import { ageFrom, SEXES, type Patient } from "@/lib/types";

export const GET = route(async (_req, ctx) => {
  const { patient } = await requireParent(ctx);
  return { patient };
});

export const PATCH = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const b = await readJson(req);
  const patch: Partial<Patient> = {};
  if ("name" in b) {
    const name = clampStr(b.name, 80);
    if (!name) throw new HttpError(400, "bad_request", "name");
    patch.name = name;
  }
  if ("date_of_birth" in b) {
    if (b.date_of_birth === null || b.date_of_birth === "") patch.date_of_birth = null;
    else if (isDateOnly(b.date_of_birth) && ageFrom(b.date_of_birth) !== null) patch.date_of_birth = b.date_of_birth;
    else throw new HttpError(400, "bad_request", "date_of_birth");
  }
  if ("sex" in b) patch.sex = pickEnum(SEXES, b.sex);
  if ("emergency_contact_name" in b) patch.emergency_contact_name = clampStr(b.emergency_contact_name, 80);
  if ("emergency_contact_phone" in b) patch.emergency_contact_phone = clampStr(b.emergency_contact_phone, 30);
  if ("emergency_number" in b) patch.emergency_number = clampStr(b.emergency_number, 10) ?? patient.emergency_number;
  if ("conditions" in b) patch.conditions = strList(b.conditions);
  if ("past_history" in b) patch.past_history = strList(b.past_history, 40, 200);
  if ("allergies" in b) patch.allergies = strList(b.allergies);
  if ("protein_goal_g" in b) {
    const g = Number(b.protein_goal_g);
    patch.protein_goal_g = b.protein_goal_g === null || b.protein_goal_g === "" ? null : Number.isFinite(g) && g > 0 && g < 400 ? g : patient.protein_goal_g;
    patch.protein_goal_set_by = patch.protein_goal_g ? clampStr(b.protein_goal_set_by, 80) : null;
  }
  const updated = await ctx.store.update("patients", patient.id, patch);
  return { patient: updated };
});
