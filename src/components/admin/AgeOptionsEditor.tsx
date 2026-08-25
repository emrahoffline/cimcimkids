"use client";

import { PRODUCT_AGE_OPTIONS } from "@/lib/product-ages";

type Props = {
  value: string[];
  onChange: (ages: string[]) => void;
};

export function AgeOptionsEditor({ value, onChange }: Props) {
  const toggle = (age: string) => {
    if (value.includes(age)) {
      onChange(value.filter((a) => a !== age));
    } else {
      onChange([...value, age]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Yaş varyantları{" "}
        <span className="font-normal text-gray-400">(birden fazla seçilebilir)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {PRODUCT_AGE_OPTIONS.map((age) => {
          const active = value.includes(age);
          return (
            <button
              key={age}
              type="button"
              onClick={() => toggle(age)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-olive bg-olive text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-olive"
              }`}
              aria-pressed={active}
            >
              {age}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <p className="text-xs text-gray-500">Seçili: {value.join(", ")}</p>
      )}
    </div>
  );
}
