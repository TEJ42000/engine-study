"use client";
import { useStore } from "@/lib/store";

export function SyncStatus({ collapsed }: { collapsed?: boolean }) {
  const { syncStatus, retryPersist } = useStore();

  if (collapsed) {
    return (
      <div 
        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
          syncStatus === "SAVING" ? "animate-pulse bg-zinc-100 text-zinc-400" :
          syncStatus === "ERROR" ? "bg-red-100 text-red-600 cursor-pointer" :
          "text-emerald-500"
        }`}
        title={syncStatus === "SAVING" ? "Saving..." : syncStatus === "ERROR" ? "Save failed! Click to retry." : "Saved"}
        onClick={syncStatus === "ERROR" ? retryPersist : undefined}
      >
        {syncStatus === "SAVING" ? "⏳" : syncStatus === "ERROR" ? "!" : "✓"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-1">
      <div 
        className={`w-2 h-2 rounded-full ${
          syncStatus === "SAVING" ? "bg-zinc-300 animate-pulse" :
          syncStatus === "ERROR" ? "bg-red-500" :
          "bg-emerald-500"
        }`}
        aria-hidden="true"
      />
      <span 
        className={`text-[10px] font-medium tracking-wide uppercase ${
          syncStatus === "ERROR" ? "text-red-600" : "text-zinc-400"
        }`}
        aria-live="polite"
      >
        {syncStatus === "SAVING" ? "Saving..." :
         syncStatus === "ERROR" ? "Save failed" :
         "Saved"}
      </span>
      {syncStatus === "ERROR" && (
        <button 
          onClick={retryPersist}
          className="text-[10px] text-zinc-900 underline underline-offset-2 hover:text-zinc-600 transition-colors ml-auto"
        >
          Retry
        </button>
      )}
    </div>
  );
}
