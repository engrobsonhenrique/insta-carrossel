"use client";

import { CarouselHistoryItem } from "@/lib/types";

interface CarouselHistoryProps {
  history: CarouselHistoryItem[];
  currentId: string | null;
  onLoad: (item: CarouselHistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

export default function CarouselHistory({
  history,
  currentId,
  onLoad,
  onDelete,
  onClear,
}: CarouselHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-400">Histórico</h3>
        <button
          onClick={onClear}
          className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
        >
          Limpar
        </button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {history.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
              currentId === item.id
                ? "bg-blue-500/20 border border-blue-500/30"
                : "bg-zinc-900/50 hover:bg-zinc-700/50 border border-transparent"
            }`}
            onClick={() => onLoad(item)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{item.topic}</p>
              <p className="text-xs text-zinc-500">
                {item.slides.length} slides · {timeAgo(item.createdAt)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="text-zinc-600 hover:text-red-400 transition-colors p-1 flex-shrink-0"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
