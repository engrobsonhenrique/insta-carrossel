"use client";

import { HookOption } from "@/lib/types";

interface HookSelectorProps {
  hooks: HookOption[];
  onSelect: (hookText: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

const styleColors: Record<string, string> = {
  "Curiosidade": "bg-purple-500/20 text-purple-400",
  "Dado impactante": "bg-orange-500/20 text-orange-400",
  "Pergunta provocativa": "bg-cyan-500/20 text-cyan-400",
  "Afirmação controversa": "bg-red-500/20 text-red-400",
  "História pessoal": "bg-green-500/20 text-green-400",
};

export default function HookSelector({
  hooks,
  onSelect,
  onSkip,
  onCancel,
}: HookSelectorProps) {
  return (
    <div className="space-y-4 p-4 md:p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl">
      <div>
        <h3 className="text-base font-semibold text-white">
          Escolha o hook do seu carrossel
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          Selecione a abertura que mais combina com o conteudo
        </p>
      </div>

      <div className="space-y-2">
        {hooks.map((hook) => (
          <button
            key={hook.id}
            onClick={() => onSelect(hook.text)}
            className="w-full text-left p-3 md:p-4 rounded-xl border border-zinc-700 hover:border-blue-500 bg-zinc-900 hover:bg-zinc-800/80 transition-all group"
          >
            <span
              className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 mb-2 ${
                styleColors[hook.style] || "bg-zinc-700 text-zinc-300"
              }`}
            >
              {hook.style}
            </span>
            <p className="text-sm md:text-base text-zinc-300 group-hover:text-white transition-colors">
              {hook.text}
            </p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onSkip}
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Surpreenda-me
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
