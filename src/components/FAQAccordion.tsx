"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Item = { q: string; a: string };

export function FAQAccordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-olive/10 bg-white"
        >
          <button
            className="flex min-h-[48px] w-full items-center justify-between gap-4 px-4 py-4 text-left font-medium text-olive sm:px-5"
            onClick={() => setOpen(open === i ? null : i)}
          >
            {item.q}
            <ChevronDown
              className={`h-5 w-5 shrink-0 transition ${open === i ? "rotate-180" : ""}`}
            />
          </button>
          {open === i && (
            <div className="border-t border-olive/10 px-5 py-4 text-sm leading-relaxed text-olive/70">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
