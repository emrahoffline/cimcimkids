"use client";

import { useRef, useState } from "react";
import { Film, ImageIcon, Upload, X } from "lucide-react";
import { storyMediaKind } from "@/lib/media";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export function StoryMediaUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const kind = value ? storyMediaKind(value) : null;

  const uploadFile = async (file: File) => {
    const isVideo = file.type.startsWith("video/");
    if (isVideo && file.size > 40 * 1024 * 1024) {
      setUploadError("Video en fazla 40 MB olabilir");
      return;
    }
    if (!isVideo && file.size > 5 * 1024 * 1024) {
      setUploadError("Görsel en fazla 5 MB olabilir");
      return;
    }

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

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Hikaye görseli veya videosu</label>

      {value ? (
        <div className="relative inline-block">
          {kind === "video" ? (
            <video
              src={value}
              muted
              playsInline
              preload="metadata"
              className="h-40 w-28 rounded-xl border border-gray-200 bg-black object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Hikaye önizleme"
              className="h-40 w-28 rounded-xl border border-gray-200 object-cover"
            />
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
            aria-label="Medyayı kaldır"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) uploadFile(file);
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
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
          }}
        />
        {uploading ? (
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        ) : (
          <>
            <Upload className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              Fotoğraf veya video seçin
            </p>
            <p className="mt-1 text-xs text-gray-400">
              JPG, PNG, WebP, MP4, WebM · görsel 5 MB / video 40 MB
            </p>
          </>
        )}
      </div>

      {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}

      {!value ? (
        <p className="flex items-center gap-1 text-xs text-amber-600">
          {kind === "video" ? (
            <Film className="h-3 w-3" />
          ) : (
            <ImageIcon className="h-3 w-3" />
          )}
          Hikaye kaydetmeden önce bir medya yükleyin
        </p>
      ) : null}
    </div>
  );
}
