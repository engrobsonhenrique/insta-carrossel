"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import CarouselSlide from "@/components/CarouselSlide";
import ProfileForm from "@/components/ProfileForm";
import { ProfileConfig, TweetData, SlideData } from "@/lib/types";
import { buildSlides } from "@/lib/slide-layout";

type Status = "idle" | "generating" | "searching" | "building" | "done";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [, setTweets] = useState<TweetData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [geminiKey, setGeminiKey] = useState("");
  const [unsplashKey, setUnsplashKey] = useState("");
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [profile, setProfile] = useState<ProfileConfig>({
    displayName: "Seu Nome",
    handle: "seuhandle",
    verified: true,
    headshotUrl: null,
    theme: "dark",
  });
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("insta-carrossel-config");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.geminiKey) setGeminiKey(data.geminiKey);
        if (data.unsplashKey) setUnsplashKey(data.unsplashKey);
        if (data.profile) setProfile(data.profile);
      }
    } catch {}
    setLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        "insta-carrossel-config",
        JSON.stringify({ geminiKey, unsplashKey, profile })
      );
    } catch {}
  }, [geminiKey, unsplashKey, profile, loaded]);

  const generate = useCallback(async () => {
    if (!topic.trim()) return;
    if (!geminiKey) {
      setStatusMessage("Adicione sua Gemini API Key nas configurações");
      return;
    }

    setStatus("generating");
    setStatusMessage("Pesquisando e escrevendo thread...");
    setSlides([]);
    setTweets([]);
    setCurrentSlide(0);

    try {
      // Step 1: Generate thread with Gemini
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, apiKey: geminiKey }),
      });

      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || "Erro ao gerar conteúdo");
      }

      const { tweets: generatedTweets, searchTerms } = await genRes.json();
      const tweetData: TweetData[] = generatedTweets.map(
        (t: { text: string }) => ({
          text: t.text,
        })
      );
      setTweets(tweetData);

      // Step 2: Search for images
      let images: string[] = [];
      if (unsplashKey && searchTerms?.length) {
        setStatus("searching");
        setStatusMessage("Buscando imagens...");

        const imgRes = await fetch("/api/search-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            searchTerms,
            accessKey: unsplashKey,
          }),
        });

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          images = imgData.images || [];
        }
      }

      // Step 3: Build slides
      setStatus("building");
      setStatusMessage("Montando slides...");

      const builtSlides = buildSlides(tweetData, images);
      setSlides(builtSlides);
      setStatus("done");
      setStatusMessage(
        `Carrossel gerado! ${builtSlides.length} slides prontos.`
      );
    } catch (error: unknown) {
      setStatus("idle");
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      setStatusMessage(message);
    }
  }, [topic, geminiKey, unsplashKey]);

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

  const downloadAll = useCallback(async () => {
    for (let i = 0; i < slides.length; i++) {
      await downloadSlide(i);
      await new Promise((r) => setTimeout(r, 500));
    }
  }, [slides, downloadSlide]);

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

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Insta Carrossel</h1>
            <p className="text-sm text-zinc-500">
              Gere carrosséis de Instagram com IA
            </p>
          </div>
          {status === "done" && (
            <button
              onClick={downloadAll}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Baixar todos os slides
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex gap-6 p-6">
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 space-y-6">
          <ProfileForm
            profile={profile}
            onChange={setProfile}
            geminiKey={geminiKey}
            onGeminiKeyChange={setGeminiKey}
            unsplashKey={unsplashKey}
            onUnsplashKeyChange={setUnsplashKey}
          />
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-6">
          {/* Topic input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="Digite o tema do carrossel... ex: O grande crescimento populacional no mundo"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={generate}
              disabled={status !== "idle" && status !== "done"}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap"
            >
              {status === "idle" || status === "done"
                ? "Gerar"
                : "Gerando..."}
            </button>
          </div>

          {/* Status */}
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

          {/* Carousel preview */}
          {slides.length > 0 && (
            <div className="space-y-4">
              {/* Slide navigation */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
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
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Baixar slide {currentSlide + 1}
                </button>
              </div>

              {/* Slide preview */}
              <div className="flex gap-6">
                {/* The actual slide (scaled for preview) */}
                <div className="flex-1">
                  <div
                    className="rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl"
                    style={{
                      maxWidth: 540,
                      margin: "0 auto",
                      height: 675,
                    }}
                  >
                    <div
                      style={{
                        transform: "scale(0.5)",
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

                {/* Edit panel */}
                <div className="w-72 space-y-3">
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
                  {slides[currentSlide].imageUrl && (
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">
                        Imagem
                      </label>
                      <img
                        src={slides[currentSlide].imageUrl}
                        alt=""
                        className="w-full rounded-lg border border-zinc-700"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Hidden renders for download */}
              <div
                style={{
                  position: "absolute",
                  left: "-9999px",
                  top: 0,
                }}
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

          {/* Empty state */}
          {slides.length === 0 && status === "idle" && !statusMessage && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
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
              <p className="text-lg">Digite um tema e clique em Gerar</p>
              <p className="text-sm mt-1">
                O carrossel será criado automaticamente
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
