"use client";
/**
 * SyllabusUploader — drag-and-drop / click-to-upload component.
 * Sends the file to /api/ai/extract and returns structured course metadata.
 */
import { useRef, useState, useCallback } from "react";

export interface ExtractedCourse {
  courseName: string;
  openBook: boolean;
  appliedVsMemorization: "MEMORIZATION" | "APPLIED" | "MIXED";
  pathGraded: boolean;
  modes: string[];
  sourceExcerpt: string;
}

interface Props {
  onExtracted: (data: ExtractedCourse) => void;
}

type Phase = "idle" | "dragging" | "uploading" | "done" | "error";

export function SyllabusUploader({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");

  const upload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setFileName(files.length === 1 ? files[0].name : `${files.length} files`);
    setPhase("uploading");
    setErrorMsg("");

    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    try {
      const endpoint = files.length > 1 ? "/api/ai/extract-batch" : "/api/ai/extract";
      // If single file, we use "file" key for backward compat with single endpoint
      // but I should probably just use "files" everywhere for the batch endpoint.
      // Actually, I'll just use the batch endpoint if > 1, or the single if 1.
      // But the single endpoint expects "file" not "files".
      const res = await fetch(files.length > 1 ? "/api/ai/extract-batch" : "/api/ai/extract", {
        method: "POST",
        body: files.length === 1 ? (() => {
          const f = new FormData();
          f.append("file", files[0]);
          return f;
        })() : form
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorMsg(body.error ?? "Extraction failed. Please try again.");
        setPhase("error");
        return;
      }
      setPhase("done");
      onExtracted(body as ExtractedCourse);
    } catch {
      setErrorMsg("Network error. Check your connection and try again.");
      setPhase("error");
    }
  }, [onExtracted]);

  function handleFiles(files: FileList | null | undefined) {
    if (!files || files.length === 0) return;
    upload(Array.from(files));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setPhase("idle");
    handleFiles(e.dataTransfer.files);
  }

  const isUploading = phase === "uploading";

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!isUploading) setPhase("dragging"); }}
        onDragLeave={() => setPhase("idle")}
        onDrop={onDrop}
        className={`
          relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
          cursor-pointer select-none transition-all duration-200 px-6 py-10 text-center
          ${phase === "dragging" ? "border-zinc-600 bg-zinc-50 scale-[1.01]" : ""}
          ${phase === "uploading" ? "border-zinc-300 bg-zinc-50 cursor-default" : ""}
          ${phase === "done" ? "border-emerald-400 bg-emerald-50" : ""}
          ${phase === "error" ? "border-red-300 bg-red-50" : ""}
          ${phase === "idle" ? "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50" : ""}
        `}
      >
        {/* Icon */}
        <div className={`text-3xl transition-transform duration-300 ${isUploading ? "animate-spin" : ""}`}>
          {phase === "done" ? "✅" : phase === "error" ? "⚠️" : isUploading ? "⏳" : "📄"}
        </div>

        {/* Label */}
        {phase === "idle" && (
          <div>
            <p className="text-sm font-medium text-zinc-700">Drop your materials here</p>
            <p className="text-xs text-zinc-400 mt-0.5">PDF, PPTX, DOCX, or TXT · max 10 MB each</p>
          </div>
        )}
        {phase === "dragging" && <p className="text-sm font-medium text-zinc-700">Release to upload</p>}
        {phase === "uploading" && (
          <div>
            <p className="text-sm font-medium text-zinc-700">Analysing <span className="font-mono text-xs">{fileName}</span>…</p>
            <p className="text-xs text-zinc-400 mt-0.5">AI is reading your materials</p>
          </div>
        )}
        {phase === "done" && (
          <div>
            <p className="text-sm font-medium text-emerald-700">Fields auto-filled!</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPhase("idle"); inputRef.current?.click(); }}
              className="mt-1 text-xs text-emerald-600 underline underline-offset-2"
            >
              Upload different materials
            </button>
          </div>
        )}
        {phase === "error" && (
          <div>
            <p className="text-sm font-medium text-red-700">{errorMsg}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPhase("idle"); }}
              className="mt-1 text-xs text-red-600 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.pptx,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-zinc-300">
        <hr className="flex-1 border-zinc-200" />
        <span className="text-xs text-zinc-400">or fill in manually</span>
        <hr className="flex-1 border-zinc-200" />
      </div>
    </div>
  );
}
