"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export function ImageUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Yükleme başarısız");
        return;
      }

      onChange(data.url);
    } catch {
      setUploadError("Bağlantı hatası, tekrar deneyin");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Ürün Görseli</label>

      {value && (
        <div className="relative inline-block">
          <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <Image
              src={value}
              alt="Önizleme"
              fill
              className="object-cover"
              sizes="160px"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
            aria-label="Görseli kaldır"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 transition ${
          dragOver
            ? "border-olive bg-olive/5"
            : "border-gray-300 bg-gray-50 hover:border-olive hover:bg-olive/5"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        ) : (
          <>
            <Upload className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              Bilgisayardan görsel seçin
            </p>
            <p className="mt-1 text-xs text-gray-400">
              veya sürükleyip bırakın · JPG, PNG, WebP (max 5 MB)
            </p>
          </>
        )}
      </div>

      {uploadError && (
        <p className="text-sm text-red-600">{uploadError}</p>
      )}

      <details className="text-sm text-gray-500">
        <summary className="cursor-pointer hover:text-gray-700">
          veya URL ile ekle
        </summary>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            className="admin-input flex-1"
            placeholder="/products/ornek.jpg"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </details>

      {!value && (
        <p className="flex items-center gap-1 text-xs text-amber-600">
          <ImageIcon className="h-3 w-3" />
          Ürün kaydetmeden önce bir görsel yükleyin
        </p>
      )}
    </div>
  );
}
