"use client";

import { useState } from "react";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (scheduledTime?: string) => Promise<void>;
  slideCount: number;
  caption: string;
  hasBlotatoConfig: boolean;
}

export default function PublishModal({
  isOpen,
  onClose,
  onPublish,
  slideCount,
  caption,
  hasBlotatoConfig,
}: PublishModalProps) {
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handlePublish = async () => {
    setPublishing(true);
    setStatus(null);

    try {
      let scheduledTime: string | undefined;
      if (mode === "schedule" && scheduleDate && scheduleTime) {
        scheduledTime = new Date(
          `${scheduleDate}T${scheduleTime}`
        ).toISOString();
      }

      await onPublish(scheduledTime);
      setStatus({
        type: "success",
        message:
          mode === "schedule"
            ? "Agendado com sucesso!"
            : "Publicado com sucesso!",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro ao publicar";
      setStatus({ type: "error", message });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Publicar no Instagram
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!hasBlotatoConfig ? (
          <div className="text-sm text-yellow-400 bg-yellow-400/10 p-3 rounded-lg">
            Configure a API Key e Account ID do Blotato nas configurações do
            perfil para publicar.
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="text-sm text-zinc-400 space-y-1">
              <p>
                <span className="text-zinc-300">{slideCount} slides</span> serão
                publicados como carrossel
              </p>
              {caption && (
                <p className="text-xs text-zinc-500 line-clamp-2">
                  Legenda: {caption.slice(0, 100)}
                  {caption.length > 100 ? "..." : ""}
                </p>
              )}
            </div>

            {/* Mode selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode("now")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  mode === "now"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                Postar agora
              </button>
              <button
                onClick={() => setMode("schedule")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  mode === "schedule"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                Agendar
              </button>
            </div>

            {/* Schedule picker */}
            {mode === "schedule" && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Status */}
            {status && (
              <div
                className={`text-sm p-3 rounded-lg ${
                  status.type === "success"
                    ? "text-green-400 bg-green-400/10"
                    : "text-red-400 bg-red-400/10"
                }`}
              >
                {status.message}
              </div>
            )}

            {/* Publish button */}
            <button
              onClick={handlePublish}
              disabled={
                publishing ||
                (mode === "schedule" && (!scheduleDate || !scheduleTime))
              }
              className="w-full py-3 rounded-xl font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            >
              {publishing
                ? "Publicando..."
                : mode === "schedule"
                  ? "Agendar publicação"
                  : "Publicar agora"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
