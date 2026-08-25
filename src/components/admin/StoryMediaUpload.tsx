"use client";

import { useRef, useState } from "react";
import { Film, ImageIcon, Link2, Upload, X } from "lucide-react";
import { storyMediaKind } from "@/lib/media";

const MAX_FILES = 20;

export type StoryMediaDraft = {
  url: string;
  linkUrl: string;
};

type Props = {
  values: StoryMediaDraft[];
  onChange: (items: StoryMediaDraft[]) => void;
  maxFiles?: number;
};

export function StoryMediaUpload({
  values,
  onChange,
  maxFiles = MAX_FILES,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const remaining = maxFiles - values.length;
    if (remaining <= 0) {
      setUploadError(`En fazla ${maxFiles} dosya eklenebilir`);
      return;
    }
    const files = incoming.slice(0, remaining);

    setUploading(true);
    setUploadError("");
    const uploaded: StoryMediaDraft[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith("video/");
      setProgress(`${i + 1}/${files.length} yükleniyor`);

      if (isVideo && file.size > 40 * 1024 * 1024) {
        errors.push(`${file.name}: video en fazla 40 MB olabilir`);
        continue;
      }
      if (!isVideo && file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name}: görsel en fazla 5 MB olabilir`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          errors.push(`${file.name}: ${data.error || "yükleme başarısız"}`);
          continue;
        }
        uploaded.push({ url: data.url, linkUrl: "" });
      } catch {
        errors.push(`${file.name}: bağlantı hatası`);
      }
    }

    if (uploaded.length) onChange([...values, ...uploaded]);
    setUploadError(errors.join(" · "));
    setProgress("");
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const setLinkAt = (index: number, linkUrl: string) => {
    onChange(
      values.map((item, i) => (i === index ? { ...item, linkUrl } : item))
    );
  };

  const canAddMore = values.length < maxFiles;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Hikaye görselleri veya videoları
      </label>

      {values.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {values.map((item, index) => {
            const kind = storyMediaKind(item.url);
            return (
              <div
                key={`${item.url}-${index}`}
                className="relative flex gap-3 rounded-xl border border-gray-200 bg-white p-2"
              >
                <div className="relative shrink-0">
                  {kind === "video" ? (
                    <video
                      src={item.url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-28 w-20 rounded-lg border border-gray-200 bg-black object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={`Hikaye ${index + 1}`}
                      className="h-28 w-20 rounded-lg border border-gray-200 object-cover"
                    />
                  )}
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                    aria-label="Medyayı kaldır"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
                    <Link2 className="h-3 w-3" />
                    Link (opsiyonel)
                  </label>
                  <input
                    className="admin-input text-sm"
                    value={item.linkUrl}
                    onChange={(e) => setLinkAt(index, e.target.value)}
                    placeholder="/tr/products/… veya https://…"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Bu kareye tıklanınca açılır
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {canAddMore ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
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
            multiple={maxFiles > 1}
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) uploadFiles(e.target.files);
            }}
          />
          {uploading ? (
            <p className="text-sm text-gray-500">{progress || "Yükleniyor..."}</p>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                {values.length > 0
                  ? "Başka fotoğraf / video ekleyin"
                  : "Bir veya daha fazla fotoğraf / video seçin"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                JPG, PNG, WebP, MP4, WebM · görsel 5 MB / video 40 MB · en fazla{" "}
                {maxFiles} dosya
              </p>
            </>
          )}
        </div>
      ) : null}

      {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}

      {values.length === 0 && !uploading ? (
        <p className="flex items-center gap-1 text-xs text-amber-600">
          <ImageIcon className="h-3 w-3" />
          Hikaye kaydetmeden önce en az bir medya yükleyin
        </p>
      ) : values.length > 0 ? (
        <p className="flex items-center gap-1 text-xs text-gray-500">
          <Film className="h-3 w-3" />
          {maxFiles === 1
            ? "Görsel, başlık ve linki kaydedince güncellenir"
            : `${values.length} dosya hazır — kaydedince aynı yuvarlakta sırayla izlenir`}
        </p>
      ) : null}
    </div>
  );
}
