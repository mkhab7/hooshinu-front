"use client";

import { Download } from "lucide-react";
import type { GenerationTask } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ResultView({ task }: { task: GenerationTask }) {
  if (!task.results?.length) return null;

  return (
    <div
      className={cn(
        "grid gap-3",
        task.results.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
      )}
    >
      {task.results.map((url, i) => (
        <div
          key={i}
          className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
        >
          {task.category === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={`نتیجه ${i + 1}`} className="w-full" />
          )}
          {task.category === "video" && (
            <video src={url} controls className="w-full" />
          )}
          {task.category === "audio" && (
            <audio src={url} controls className="w-full p-3" />
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="absolute end-2 top-2 flex size-9 items-center justify-center rounded-lg bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Download className="size-4" />
          </a>
        </div>
      ))}
    </div>
  );
}
