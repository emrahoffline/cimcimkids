"use client";

import { Plus, X } from "lucide-react";
import type { ProductColor } from "@/lib/types";
import { COLOR_PRESETS, slugColorId } from "@/lib/product-variants";

type Props = {
  value: ProductColor[];
  onChange: (colors: ProductColor[]) => void;
};

export function ColorOptionsEditor({ value, onChange }: Props) {
  const addPreset = (preset: (typeof COLOR_PRESETS)[number]) => {
    const id = slugColorId(preset.labelTr);
    if (value.some((c) => c.id === id || c.labelTr === preset.labelTr)) return;
    onChange([
      ...value,
      {
        id,
        labelTr: preset.labelTr,
        labelEn: preset.labelEn,
        hex: preset.hex,
      },
    ]);
  };

  const addCustom = () => {
    onChange([
      ...value,
      {
        id: `color-${Date.now()}`,
        labelTr: "",
        labelEn: "",
        hex: "#cccccc",
      },
    ]);
  };

  const update = (index: number, patch: Partial<ProductColor>) => {
    onChange(
      value.map((c, i) => {
        if (i !== index) return c;
        const next = { ...c, ...patch };
        if (patch.labelTr !== undefined && !patch.id) {
          next.id = slugColorId(patch.labelTr || c.id);
        }
        return next;
      })
    );
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Renk seçenekleri</label>
      <p className="text-xs text-gray-500">
        İsteğe bağlı. Müşteri ürün sayfasında renk seçebilir.
      </p>

      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.labelTr}
            type="button"
            onClick={() => addPreset(preset)}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-xs hover:border-olive"
          >
            <span
              className="h-3 w-3 rounded-full border border-black/10"
              style={{ backgroundColor: preset.hex }}
            />
            {preset.labelTr}
          </button>
        ))}
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((color, index) => (
            <div
              key={`${color.id}-${index}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2"
            >
              <input
                type="color"
                value={color.hex}
                onChange={(e) => update(index, { hex: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded border border-gray-200 bg-white"
                aria-label="Renk"
              />
              <input
                className="admin-input min-w-[7rem] flex-1"
                placeholder="Ad (TR)"
                value={color.labelTr}
                onChange={(e) => update(index, { labelTr: e.target.value })}
              />
              <input
                className="admin-input min-w-[7rem] flex-1"
                placeholder="Name (EN)"
                value={color.labelEn}
                onChange={(e) => update(index, { labelEn: e.target.value })}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                aria-label="Rengi kaldır"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addCustom}
        className="admin-btn-secondary inline-flex items-center gap-1 text-sm"
      >
        <Plus className="h-4 w-4" />
        Özel renk ekle
      </button>
    </div>
  );
}
