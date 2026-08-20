"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Category } from "@/lib/types";

const NEW_CATEGORY_VALUE = "__new_category__";

type Props = {
  value: string;
  onChange: (slug: string) => void;
};

export function CategorySelect({ value, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newNameTr, setNewNameTr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadCategories = () => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then(setCategories);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === NEW_CATEGORY_VALUE) {
      setShowNewForm(true);
      return;
    }
    setShowNewForm(false);
    onChange(v);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameTr.trim()) {
      setError("Kategori adı gerekli");
      return;
    }

    setCreating(true);
    setError("");

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameTr: newNameTr.trim(),
        nameEn: newNameEn.trim() || newNameTr.trim(),
      }),
    });

    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(data.error || "Kategori oluşturulamadı");
      return;
    }

    loadCategories();
    onChange(data.slug);
    setShowNewForm(false);
    setNewNameTr("");
    setNewNameEn("");
  };

  return (
    <div className="space-y-3">
      <label className="mb-1 block text-sm font-medium">Kategori</label>
      <select
        className="admin-input"
        value={showNewForm ? NEW_CATEGORY_VALUE : value}
        onChange={handleSelectChange}
      >
        {categories.length === 0 && (
          <option value="">Yükleniyor...</option>
        )}
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.nameTr}
          </option>
        ))}
        <option value={NEW_CATEGORY_VALUE} className="font-semibold text-olive">
          + Yeni kategori oluştur
        </option>
      </select>

      {showNewForm && (
        <div className="rounded-xl border border-olive/20 bg-olive/5 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-olive">
            <Plus className="h-4 w-4" />
            Yeni Kategori
          </p>
          <form onSubmit={handleCreateCategory} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Kategori adı (TR) *
              </label>
              <input
                required
                className="admin-input"
                value={newNameTr}
                onChange={(e) => setNewNameTr(e.target.value)}
                placeholder="Örn: Aydınlatma"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Kategori adı (EN){" "}
                <span className="font-normal text-gray-400">(opsiyonel)</span>
              </label>
              <input
                className="admin-input"
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                placeholder="Boş bırakılırsa Türkçe ad kullanılır"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="admin-btn-primary text-sm"
              >
                {creating ? "Oluşturuluyor..." : "Kategori Oluştur"}
              </button>
              <button
                type="button"
                className="admin-btn-secondary text-sm"
                onClick={() => {
                  setShowNewForm(false);
                  setError("");
                }}
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
