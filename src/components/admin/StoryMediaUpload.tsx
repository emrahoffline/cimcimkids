"use client";

import { useRef, useState } from "react";
import { Film, ImageIcon, Upload, X } from "lucide-react";
import { storyMediaKind } from "@/lib/media";

const MAX_FILES = 20;

type Props = {
  values: string[];
  onChange: (urls: string[]) => void;
};

export function StoryMediaUpload({ values, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const remaining = MAX_FILES - values.length;
    if (remaining <= 0) {
      setUploadError(`En fazla ${MAX_FILES} dosya eklenebilir`);
      return;
    }
    const files = incoming.slice(0, remaining);

    setUploading(true);
    setUploadError("");
    const uploaded: string[] = [];
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
        uploaded.push(data.url);
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

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Hikaye görselleri veya videoları
      </label>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {values.map((value, index) => {
            const kind = storyMediaKind(value);
            return (
              <div key={`${value}-${index}`} className="relative">
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
                    alt={`Hikaye ${index + 1}`}
                    className="h-40 w-28 rounded-xl border border-gray-200 object-cover"
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
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
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
          multiple
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
              Bir veya daha fazla fotoğraf / video seçin
            </p>
            <p className="mt-1 text-xs text-gray-400">
              JPG, PNG, WebP, MP4, WebM · görsel 5 MB / video 40 MB · en fazla{" "}
              {MAX_FILES} dosya
            </p>
          </>
        )}
      </div>

      {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}

      {values.length === 0 && !uploading ? (
        <p className="flex items-center gap-1 text-xs text-amber-600">
          <ImageIcon className="h-3 w-3" />
          Hikaye kaydetmeden önce en az bir medya yükleyin
        </p>
      ) : values.length > 0 ? (
        <p className="flex items-center gap-1 text-xs text-gray-500">
          <Film className="h-3 w-3" />
          {values.length} dosya hazır — kaydedince aynı yuvarlakta sırayla izlenir
        </p>
      ) : null}
    </div>
  );
}
