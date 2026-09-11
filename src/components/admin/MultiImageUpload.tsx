"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { isUploadedProductImage } from "@/lib/image-utils";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
};

export function MultiImageUpload({ value, onChange, max = 8 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, Math.max(0, max - value.length));
    if (list.length === 0) return;

    setUploading(true);
    setUploadError("");
    const next = [...value];

    try {
      for (const file of list) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          setUploadError(data.error || "Yükleme başarısız");
          break;
        }
        if (typeof data.url === "string" && !next.includes(data.url)) {
          next.push(data.url);
        }
      }
      onChange(next);
    } catch {
      setUploadError("Bağlantı hatası, tekrar deneyin");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Ürün görselleri{" "}
        <span className="font-normal text-gray-400">
          (ilk görsel kapak · max {max})
        </span>
      </label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((url, index) => (
            <div key={url} className="relative">
              <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <Image
                  src={url}
                  alt={`Görsel ${index + 1}`}
                  fill
                  unoptimized={isUploadedProductImage(url)}
                  className="object-cover"
                  sizes="112px"
                />
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    Kapak
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                aria-label="Görseli kaldır"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="mt-1 flex justify-center gap-1">
                <button
                  type="button"
                  className="rounded px-1.5 text-[10px] text-gray-500 hover:bg-gray-100"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 text-[10px] text-gray-500 hover:bg-gray-100"
                  onClick={() => move(index, index + 1)}
                  disabled={index === value.length - 1}
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void uploadFiles(e.dataTransfer.files);
          }}
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
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <p className="text-sm text-gray-500">Yükleniyor...</p>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                Görsel ekleyin (birden fazla seçilebilir)
              </p>
              <p className="mt-1 text-xs text-gray-400">
                JPG, PNG, WebP · max 5 MB / dosya
              </p>
            </>
          )}
        </div>
      )}

      {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

      {value.length === 0 && (
        <p className="flex items-center gap-1 text-xs text-amber-600">
          <ImageIcon className="h-3 w-3" />
          Ürün kaydetmeden önce en az bir görsel yükleyin
        </p>
      )}
    </div>
  );
}
