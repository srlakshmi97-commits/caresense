"use client";

import { AlertTriangle, Bell, CheckCircle2, FileText, Pill } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/client";

const KINDS = {
  emergency: { icon: AlertTriangle, cls: "border-urgent/40 bg-urgent-soft", iconCls: "text-urgent" },
  pain: { icon: AlertTriangle, cls: "border-warn/40 bg-warn-soft", iconCls: "text-warn" },
  medication: { icon: Pill, cls: "border-warn/40 bg-warn-soft", iconCls: "text-warn" },
  new_report: { icon: FileText, cls: "border-calm/30 bg-calm-soft", iconCls: "text-calm" },
  info: { icon: Bell, cls: "border-line bg-surface", iconCls: "text-muted" },
  ok: { icon: CheckCircle2, cls: "border-ok/30 bg-ok-soft", iconCls: "text-ok" },
} as const;

/** Alert / notification card. Kind is conveyed by icon + title text, not colour alone. */
export function AlertCard({
  kind,
  title,
  children,
  meta,
  action,
  unread,
}: {
  kind: keyof typeof KINDS;
  title: string;
  children?: ReactNode;
  meta?: string;
  action?: ReactNode;
  unread?: boolean;
}) {
  const t = useT();
  const k = KINDS[kind];
  const Icon = k.icon;
  return (
    <div className={`flex gap-3 rounded-2xl border-2 p-4 ${k.cls}`}>
      <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${k.iconCls}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold">
          {title}
          {unread && <span className="ml-2 rounded-full bg-calm px-2 py-0.5 align-middle text-sm font-bold text-white">{t("common.new")}</span>}
        </p>
        {children && <div className="text-base text-ink">{children}</div>}
        {meta && <p className="mt-1 text-base text-muted">{meta}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
