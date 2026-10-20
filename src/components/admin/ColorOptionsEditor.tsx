"use client";

import { Plus, X } from "lucide-react";
import type { ProductColor } from "@/lib/types";
import { COLOR_PRESETS, slugColorId } from "@/lib/product-variants";
import { sizeStockTotal } from "@/lib/product-stock";

type Props = {
  value: ProductColor[];
  ages: string[];
  onChange: (colors: ProductColor[]) => void;
  onSizeEdited?: () => void;
};

export function ColorOptionsEditor({
  value,
  ages,
  onChange,
  onSizeEdited,
}: Props) {
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
        stock: ages.length > 0 ? 0 : 1,
        ...(ages.length > 0 ? { sizeStock: {} } : {}),
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
        stock: ages.length > 0 ? 0 : 1,
        ...(ages.length > 0 ? { sizeStock: {} } : {}),
      },
    ]);
  };

  const update = (index: number, patch: Partial<ProductColor>) => {
    onChange(
      value.map((c, i) => {
        if (i !== index) return c;
        return { ...c, ...patch };
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
        İsteğe bağlı. Renk seçseniz de stok beden beden kalır. Bir bedenden
        satış, diğer bedenlerin ve diğer renklerin stoğunu düşürmez.
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
              key={color.id}
              className="rounded-lg border border-gray-100 bg-gray-50 p-2"
            >
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="color"
                defaultValue={color.hex}
                onChange={(e) => update(index, { hex: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded border border-gray-200 bg-white"
                aria-label="Renk"
              />
              <input
                className="admin-input min-w-[7rem] flex-1"
                placeholder="Ad (TR)"
                value={color.labelTr}
                autoComplete="off"
                onChange={(e) => update(index, { labelTr: e.target.value })}
              />
              <input
                className="admin-input min-w-[7rem] flex-1"
                placeholder="Name (EN)"
                value={color.labelEn}
                autoComplete="off"
                onChange={(e) => update(index, { labelEn: e.target.value })}
              />
              {ages.length === 0 && (
                <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                  Stok
                  <input
                    type="number"
                    min={0}
                    step={1}
                    required
                    className="admin-input w-20"
                    value={color.stock ?? 0}
                    onChange={(e) =>
                      update(index, {
                        stock: Math.max(
                          0,
                          Math.floor(Number(e.target.value) || 0)
                        ),
                      })
                    }
                    aria-label={`${color.labelTr || "Renk"} stok adedi`}
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                aria-label="Rengi kaldır"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
              {ages.length > 0 && value.length > 1 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ages.map((age) => (
                    <label
                      key={age}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5"
                    >
                      <span className="text-xs font-medium text-gray-700">
                        {age}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        required
                        className="admin-input w-16"
                        value={color.sizeStock?.[age] ?? 0}
                        onChange={(event) => {
                          const sizeStock = {
                            ...(color.sizeStock ?? {}),
                            [age]: Math.max(
                              0,
                              Math.floor(Number(event.target.value) || 0)
                            ),
                          };
                          onSizeEdited?.();
                          update(index, {
                            sizeStock,
                            stock: sizeStockTotal(sizeStock),
                          });
                        }}
                        aria-label={`${color.labelTr || "Renk"} ${age} stok adedi`}
                      />
                    </label>
                  ))}
                </div>
              )}
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
