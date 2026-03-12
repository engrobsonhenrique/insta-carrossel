"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import CarouselSlide from "@/components/CarouselSlide";
import ProfileForm from "@/components/ProfileForm";
import CarouselHistory from "@/components/CarouselHistory";
import AuthButton from "@/components/AuthButton";
import LoginScreen from "@/components/LoginScreen";
import { useAuth } from "@/components/AuthProvider";
import {
  ProfileConfig,
  TweetData,
  SlideData,
  CarouselHistoryItem,
  GenerationMode,
  CTAType,
  CaptionFormat,
  AdvancedOptions,
} from "@/lib/types";
import { splitTextIntoTweets, buildCTATweet } from "@/lib/text-splitter";
import { buildSlides } from "@/lib/slide-layout";
import {
  getHistory,
  saveToHistory,
  deleteFromHistory,
  clearHistory,
} from "@/lib/carousel-history";

type Status = "idle" | "generating" | "searching" | "building" | "done";

export default function Home() {
  const { user, loading } = useAuth();
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [, setTweets] = useState<TweetData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.5);
  const [profile, setProfile] = useState<ProfileConfig>({
    displayName: "Seu Nome",
    handle: "seuhandle",
    verified: true,
    headshotUrl: null,
    theme: "dark",
  });
  const [mode, setMode] = useState<GenerationMode>("rapido");
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({
    ctaType: "salvar",
  });
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [history, setHistory] = useState<CarouselHistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Responsive preview scaling
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      setPreviewScale(Math.min(width / 1080, 0.5));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [slides]);

  // Load data on mount
  useEffect(() => {
    if (loading) return;

    async function loadData() {
      // Load from localStorage first
      try {
        const saved = localStorage.getItem("insta-carrossel-config");
        if (saved) {
          const data = JSON.parse(saved);
          if (data.profile) setProfile(data.profile);
        }
      } catch {}
      setHistory(getHistory());

      // Then try to load from cloud if logged in
      if (user) {
        try {
          const [profileRes, carouselsRes] = await Promise.all([
            fetch("/api/sync?action=load-profile"),
            fetch("/api/sync?action=load-carousels"),
          ]);
          if (profileRes.ok) {
            const { profile: cloudProfile } = await profileRes.json();
            if (cloudProfile) {
              setProfile({
                displayName: cloudProfile.display_name,
                handle: cloudProfile.handle,
                verified: cloudProfile.verified,
                headshotUrl: cloudProfile.headshot_url,
                theme: cloudProfile.theme,
                persona: cloudProfile.persona || "",
              });
            }
          }
          if (carouselsRes.ok) {
            const { carousels } = await carouselsRes.json();
            if (carousels?.length > 0) {
              setHistory(
                carousels.map((row: Record<string, unknown>) => ({
                  id: row.id,
                  topic: row.topic,
                  slides: row.slides,
                  profile: row.profile_snapshot,
                  createdAt: row.created_at,
                }))
              );
            }
          }
        } catch {}
      }

      setLoaded(true);
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  // Save profile on change
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(
        "insta-carrossel-config",
        JSON.stringify({ profile })
      );
    } catch {}

    if (user) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save-profile", profile }),
        }).catch(() => {});
      }, 2000);
    }
  }, [profile, loaded, user]);

  const generate = useCallback(async () => {
    const isPasteMode = mode === "avancado" && advancedOptions.usePasteText && advancedOptions.pasteOwnText?.trim();
    if (!isPasteMode && !topic.trim()) return;
    if (isPasteMode && !advancedOptions.pasteOwnText?.trim()) return;

    setSlides([]);
    setTweets([]);
    setCaption("");
    setCurrentSlide(0);
    setSidebarOpen(false);

    try {
      let tweetData: TweetData[];
      let searchTerms: string[] | undefined;

      if (isPasteMode) {
        // Paste mode: skip Gemini, split text into tweets locally
        setStatus("building");
        setStatusMessage("Formatando seu texto em slides...");

        tweetData = splitTextIntoTweets(advancedOptions.pasteOwnText!);
        // Add CTA tweet at the end
        tweetData.push(buildCTATweet(advancedOptions.ctaType, advancedOptions.ctaCustomText));
        setTweets(tweetData);

        // Use topic as search term for images
        if (topic.trim()) {
          searchTerms = [topic.trim()];
        }
      } else {
        // AI mode: generate via Gemini
        setStatus("generating");
        const isUrl = /^https?:\/\//i.test(topic.trim());
        setStatusMessage(isUrl ? "Lendo matéria e escrevendo thread..." : "Pesquisando e escrevendo thread...");

        const genBody: Record<string, string | undefined> = {
          topic,
          persona: profile.persona,
        };
        if (mode === "avancado") {
          genBody.ctaType = advancedOptions.ctaType;
          if (advancedOptions.ctaType === "custom") {
            genBody.ctaCustomText = advancedOptions.ctaCustomText;
          }
          if (advancedOptions.captionFormat) {
            genBody.captionFormat = advancedOptions.captionFormat;
          }
        }

        const genRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(genBody),
        });

        if (!genRes.ok) {
          let errMsg = "Erro ao gerar conteúdo";
          try {
            const err = await genRes.json();
            errMsg = err.error || errMsg;
          } catch {
            errMsg = await genRes.text().catch(() => errMsg);
          }
          throw new Error(errMsg);
        }

        let genData;
        try {
          genData = await genRes.json();
        } catch {
          throw new Error("Resposta inválida do servidor. Tente novamente.");
        }
        tweetData = genData.tweets.map((t: { text: string }) => ({ text: t.text }));
        searchTerms = genData.searchTerms;
        if (genData.caption) setCaption(genData.caption);
        setTweets(tweetData);
      }

      // Search images
      let images: string[] = [];
      if (searchTerms?.length) {
        setStatus("searching");
        setStatusMessage("Buscando imagens...");

        const imgRes = await fetch("/api/search-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ searchTerms }),
        });

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          images = imgData.images || [];
        }
      }

      // Build slides
      setStatus("building");
      setStatusMessage("Montando slides...");

      const builtSlides = buildSlides(tweetData, images);
      setSlides(builtSlides);
      setStatus("done");
      setStatusMessage(
        `Carrossel gerado! ${builtSlides.length} slides prontos.`
      );

      // Save to history
      const historyTopic = topic.trim() || "Texto colado";
      const saved = saveToHistory({ topic: historyTopic, slides: builtSlides, profile });
      setCurrentHistoryId(saved.id);
      setHistory(getHistory());

      // Save to cloud if logged in
      if (user) {
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save-carousel",
            topic: historyTopic,
            slides: builtSlides,
            profile,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.carousel) {
              setCurrentHistoryId(data.carousel.id);
            }
          })
          .catch(() => {});
      }
    } catch (error: unknown) {
      setStatus("idle");
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      setStatusMessage(message);
    }
  }, [topic, profile, mode, advancedOptions, user]);

  const downloadSlide = useCallback(async (index: number) => {
    const el = slideRefs.current[index];
    if (!el) return;
    try {
      const dataUrl = await toPng(el, {
        width: 1080,
        height: 1350,
        pixelRatio: 1,
      });
      const link = document.createElement("a");
      link.download = `slide-${index + 1}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download error:", err);
    }
  }, []);

  const downloadAllAsZip = useCallback(async () => {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (let i = 0; i < slides.length; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;
        const dataUrl = await toPng(el, {
          width: 1080,
          height: 1350,
          pixelRatio: 1,
        });
        const base64 = dataUrl.split(",")[1];
        zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, base64, {
          base64: true,
        });
        setDownloadProgress(Math.round(((i + 1) / slides.length) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `carrossel-${topic.replace(/\s+/g, "-").toLowerCase()}.zip`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP error:", err);
    }
    setDownloading(false);
  }, [slides, topic]);

  const updateTweetText = (
    slideIndex: number,
    tweetIndex: number,
    text: string
  ) => {
    const newSlides = [...slides];
    newSlides[slideIndex] = {
      ...newSlides[slideIndex],
      tweets: newSlides[slideIndex].tweets.map((t, i) =>
        i === tweetIndex ? { ...t, text } : t
      ),
    };
    setSlides(newSlides);
  };

  const updateSlideImage = (slideIndex: number, imageUrl: string | undefined) => {
    const newSlides = [...slides];
    newSlides[slideIndex] = {
      ...newSlides[slideIndex],
      imageUrl,
    };
    setSlides(newSlides);
  };

  const handleImageUpload = (slideIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        updateSlideImage(slideIndex, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadCarousel = (item: CarouselHistoryItem) => {
    setSlides(item.slides);
    setCurrentSlide(0);
    setCurrentHistoryId(item.id);
    setTopic(item.topic);
    setStatus("done");
    setStatusMessage(`Carrossel carregado: ${item.topic}`);
    setSidebarOpen(false);
  };

  const handleDeleteHistory = (id: string) => {
    deleteFromHistory(id);
    setHistory(getHistory());
    if (currentHistoryId === id) setCurrentHistoryId(null);
    if (user) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-carousel", id }),
      }).catch(() => {});
    }
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setCurrentHistoryId(null);
    if (user) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-carousels" }),
      }).catch(() => {});
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Require login
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
            >
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold">Insta Carrossel</h1>
              <p className="text-xs md:text-sm text-zinc-500 hidden sm:block">
                Gere carrosséis de Instagram com IA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-green-500 hidden sm:inline-flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Sincronizado na nuvem
              </span>
            )}
            <AuthButton />
            {status === "done" && (
              <button
                onClick={downloadAllAsZip}
                disabled={downloading}
                className="bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap"
              >
                {downloading
                  ? `Baixando... ${downloadProgress}%`
                  : "Baixar ZIP"}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-80 bg-zinc-950 border-r border-zinc-800 p-4 overflow-y-auto
            transform transition-transform duration-300 ease-in-out
            md:relative md:inset-auto md:z-auto md:transform-none md:border-r-0 md:p-0
            md:w-80 md:flex-shrink-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute top-3 right-3 p-2 text-zinc-400 hover:text-white"
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 5L5 15M5 5l10 10" />
            </svg>
          </button>

          <div className="space-y-6 mt-8 md:mt-0">
            <ProfileForm
              profile={profile}
              onChange={setProfile}
            />
            <CarouselHistory
              history={history}
              currentId={currentHistoryId}
              onLoad={loadCarousel}
              onDelete={handleDeleteHistory}
              onClear={handleClearHistory}
            />
          </div>
        </aside>

        <div className="flex-1 space-y-4 md:space-y-6 min-w-0">
          {/* Mode toggle */}
          <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 w-fit">
            <button
              onClick={() => setMode("rapido")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "rapido"
                  ? "bg-blue-500 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Rapido
            </button>
            <button
              onClick={() => setMode("avancado")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "avancado"
                  ? "bg-blue-500 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Avancado
            </button>
          </div>

          <div className="flex gap-2 md:gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder={
                mode === "avancado" && advancedOptions.usePasteText
                  ? "Titulo do carrossel (opcional)..."
                  : "Digite o tema ou cole o link de uma materia..."
              }
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 md:px-4 py-3 text-sm md:text-base text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={generate}
              disabled={status !== "idle" && status !== "done"}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 md:px-6 py-3 rounded-xl text-sm md:text-base font-medium transition-colors whitespace-nowrap"
            >
              {status === "idle" || status === "done" ? "Gerar" : "Gerando..."}
            </button>
          </div>

          {/* Advanced options */}
          {mode === "avancado" && (
            <div className="space-y-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              {/* CTA selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Call-to-Action (ultimo slide)
                </label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: "salvar", label: "Salvar" },
                    { value: "compartilhar", label: "Compartilhar" },
                    { value: "comentar", label: "Comentar" },
                    { value: "custom", label: "Personalizado" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setAdvancedOptions((prev) => ({
                          ...prev,
                          ctaType: opt.value,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        advancedOptions.ctaType === opt.value
                          ? "bg-blue-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {advancedOptions.ctaType === "custom" && (
                  <input
                    type="text"
                    value={advancedOptions.ctaCustomText || ""}
                    onChange={(e) =>
                      setAdvancedOptions((prev) => ({
                        ...prev,
                        ctaCustomText: e.target.value,
                      }))
                    }
                    placeholder="Ex: Comente SIM para receber o material completo!"
                    className="w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>

              {/* Caption format */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Legenda do post
                </label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: undefined, label: "Sem legenda" },
                    { value: "curta", label: "Curta" },
                    { value: "longa", label: "Longa" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() =>
                        setAdvancedOptions((prev) => ({
                          ...prev,
                          captionFormat: opt.value as CaptionFormat | undefined,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        advancedOptions.captionFormat === opt.value
                          ? "bg-blue-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-1.5">
                  {advancedOptions.captionFormat === "curta"
                    ? "2-4 linhas, direta ao ponto com CTA."
                    : advancedOptions.captionFormat === "longa"
                      ? "8-15 linhas com contexto, storytelling e hashtags."
                      : "Nenhuma legenda sera gerada."}
                </p>
              </div>

              {/* Paste own text */}
              <div>
                <label
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 cursor-pointer"
                  onClick={() =>
                    setAdvancedOptions((prev) => ({
                      ...prev,
                      usePasteText: !prev.usePasteText,
                      pasteOwnText: prev.usePasteText ? "" : prev.pasteOwnText,
                    }))
                  }
                >
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      advancedOptions.usePasteText ? "bg-blue-500" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        advancedOptions.usePasteText ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  Usar meu proprio texto
                </label>
                {advancedOptions.usePasteText && (
                  <>
                    <p className="text-xs text-zinc-500 mt-2 mb-2">
                      Cole seu texto pronto e vamos formatar em slides automaticamente. O campo acima vira o titulo.
                    </p>
                    <textarea
                      value={advancedOptions.pasteOwnText || ""}
                      onChange={(e) =>
                        setAdvancedOptions((prev) => ({
                          ...prev,
                          pasteOwnText: e.target.value,
                        }))
                      }
                      placeholder="Cole aqui seu texto longo..."
                      rows={6}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              className={`text-sm px-4 py-2 rounded-lg ${
                status === "idle"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : status === "done"
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}
            >
              {(status === "generating" ||
                status === "searching" ||
                status === "building") && (
                <span className="inline-block animate-spin mr-2">&#9696;</span>
              )}
              {statusMessage}
            </div>
          )}

          {slides.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5 md:gap-2 flex-wrap">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                        i === currentSlide
                          ? "bg-blue-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => downloadSlide(currentSlide)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition-colors whitespace-nowrap"
                >
                  Baixar {currentSlide + 1}
                </button>
              </div>

              <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
                <div className="flex-1" ref={previewRef}>
                  <div
                    className="rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl mx-auto"
                    style={{
                      maxWidth: 540,
                      height: Math.round(previewScale * 1350),
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${previewScale})`,
                        transformOrigin: "top left",
                        width: 1080,
                        height: 1350,
                      }}
                    >
                      <CarouselSlide
                        slide={slides[currentSlide]}
                        profile={profile}
                        slideNumber={currentSlide + 1}
                        totalSlides={slides.length}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-72 space-y-3">
                  <h3 className="text-sm font-medium text-zinc-400">
                    Editar slide {currentSlide + 1}
                  </h3>
                  {slides[currentSlide].tweets.map((tweet, tweetIdx) => (
                    <div key={tweetIdx}>
                      <label className="block text-xs text-zinc-500 mb-1">
                        Tweet {tweetIdx + 1}
                      </label>
                      <textarea
                        value={tweet.text}
                        onChange={(e) =>
                          updateTweetText(
                            currentSlide,
                            tweetIdx,
                            e.target.value
                          )
                        }
                        rows={4}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-blue-500"
                      />
                      <div className="text-xs text-zinc-600 text-right">
                        {tweet.text.length} chars
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">
                      Imagem do slide
                    </label>
                    {slides[currentSlide].imageUrl && (
                      <img
                        src={slides[currentSlide].imageUrl}
                        alt=""
                        className="w-full rounded-lg border border-zinc-700 mb-2"
                      />
                    )}
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-2 px-3 rounded-lg text-center transition-colors">
                        {slides[currentSlide].imageUrl ? "Trocar imagem" : "Enviar imagem"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(currentSlide, file);
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {slides[currentSlide].imageUrl && (
                        <button
                          onClick={() => updateSlideImage(currentSlide, undefined)}
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Generated caption */}
              {caption && (
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-zinc-400">
                      Legenda do post
                    </h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(caption);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Copiar
                    </button>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={Math.min(caption.split("\n").length + 2, 12)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              )}

              <div
                style={{ position: "absolute", left: "-9999px", top: 0 }}
              >
                {slides.map((slide, i) => (
                  <div
                    key={slide.id}
                    ref={(el) => {
                      slideRefs.current[i] = el;
                    }}
                  >
                    <CarouselSlide
                      slide={slide}
                      profile={profile}
                      slideNumber={i + 1}
                      totalSlides={slides.length}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {slides.length === 0 && status === "idle" && !statusMessage && (
            <div className="flex flex-col items-center justify-center py-12 md:py-20 text-zinc-600">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mb-4"
              >
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <path d="M7 2v20M17 2v20" />
              </svg>
              <p className="text-base md:text-lg">
                Digite um tema, cole um link ou use o modo Avancado
              </p>
              <p className="text-sm mt-1">
                O carrossel sera criado automaticamente
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
