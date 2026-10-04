"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Button } from "./Button";

/** Type-and-add list (conditions, allergies, medicines) with large remove buttons. */
export function ListInput({ id, value, onChange, hint }: { id: string; value: string[]; onChange: (v: string[]) => void; hint?: string }) {
  const t = useT();
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setText("");
  };
  return (
    <div>
      {hint && (
        <p id={`${id}-hint`} className="mb-2 text-lg text-muted">
          {hint}
        </p>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          className="field flex-1"
          value={text}
          maxLength={120}
          aria-describedby={hint ? `${id}-hint` : undefined}
          placeholder={t("onboarding.itemPlaceholder")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="secondary" onClick={add} disabled={!text.trim()} icon={<Plus className="h-5 w-5" aria-hidden />}>
          {t("onboarding.addItem")}
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {value.map((v) => (
            <li key={v} className="flex items-center justify-between gap-2 rounded-2xl border-2 border-brand/30 bg-brand-soft py-1 pl-4 pr-1 text-lg font-semibold">
              {v}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="flex min-h-touch min-w-touch items-center justify-center gap-1 rounded-xl px-2 text-base text-muted hover:bg-surface hover:text-urgent"
              >
                <X className="h-5 w-5" aria-hidden />
                <span className="sr-only">
                  {t("common.remove")} {v}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
