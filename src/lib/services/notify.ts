// In-app family notifications. A notification is only created when the
// parent has switched on BOTH the alert type AND the matching data-sharing
// permission — so sensitive details are never pushed without authorisation.
//
// We store the notification kind + parameters, so each family member reads it
// in their OWN language. English title/body are kept as a fallback.

import type { Ctx } from "../auth/session";
import { t, type MessageKey } from "../i18n";
import type { NotificationKind, Patient, PermissionKey } from "../types";
import { newId, nowIso } from "../util";

const REQUIRED_PERMISSION: Record<NotificationKind, PermissionKey> = {
  pain: "symptoms",
  medication: "medications",
  emergency: "alerts",
  new_report: "records",
};

export async function notifyFamily(ctx: Ctx, patient: Patient, kind: NotificationKind, params: Record<string, string>) {
  try {
    const links = await ctx.store.list("family_links", { patient_id: patient.id, status: "active" });
    let sent = false;
    for (const link of links) {
      if (!link.alert_prefs[kind] || !link.permissions[REQUIRED_PERMISSION[kind]]) continue;
      await ctx.store.insert("notifications", {
        id: newId(),
        patient_id: patient.id,
        family_link_id: link.id,
        kind,
        title: t(`notifications.${kind}Title` as MessageKey, params),
        body: t(`notifications.${kind}Body` as MessageKey, params),
        params,
        read: false,
        created_at: nowIso(),
      });
      sent = true;
    }
    return sent;
  } catch {
    console.error("[caresense] notify failed");
    return false;
  }
}

export const firstName = (p: Patient) => p.name.split(" ")[0] || p.name;
