"use client";

import {
  PRODUCT_AGE_OPTIONS,
  agesMatch,
  canonicalizeAge,
} from "@/lib/product-ages";

type Props = {
  value: string[];
  onChange: (ages: string[]) => void;
};

export function AgeOptionsEditor({ value, onChange }: Props) {
  const canonicalValue = value
    .map((age) => canonicalizeAge(age))
    .filter((age): age is string => Boolean(age));

  const extraSelected = canonicalValue.filter(
    (age) =>
      !(PRODUCT_AGE_OPTIONS as readonly string[]).includes(age) &&
      !PRODUCT_AGE_OPTIONS.some((opt) => agesMatch(opt, age))
  );

  const isActive = (age: string) =>
    canonicalValue.some((selected) => agesMatch(selected, age));

  const toggle = (age: string) => {
    const canonical = canonicalizeAge(age) ?? age;
    if (isActive(canonical)) {
      onChange(
        canonicalValue.filter((selected) => !agesMatch(selected, canonical))
      );
    } else {
      onChange([...canonicalValue, canonical]);
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
          const active = isActive(age);
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
        {extraSelected.map((age) => (
          <button
            key={age}
            type="button"
            onClick={() => toggle(age)}
            className="rounded-full border border-olive bg-olive px-3 py-1.5 text-xs font-medium text-white"
            aria-pressed
          >
            {age}
          </button>
        ))}
      </div>
      {canonicalValue.length > 0 && (
        <p className="text-xs text-gray-500">
          Seçili: {canonicalValue.join(", ")}
        </p>
      )}
    </div>
  );
}
