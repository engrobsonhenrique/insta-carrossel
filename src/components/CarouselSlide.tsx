"use client";

import { SlideData, ProfileConfig } from "@/lib/types";
import { getPalette } from "@/lib/palettes";

interface CarouselSlideProps {
  slide: SlideData;
  profile: ProfileConfig;
  slideNumber: number;
  totalSlides: number;
}

export default function CarouselSlide({
  slide,
  profile,
  slideNumber,
  totalSlides,
}: CarouselSlideProps) {
  const palette = getPalette(profile.paletteId, profile.theme);
  const bgColor = palette.bg;
  const textColor = palette.text;
  const secondaryColor = palette.secondary;
  const dividerColor = palette.divider;
  const badgeColor = palette.accent;

  const isPersuasivo = slide.contentStyle === "persuasivo" && slide.persuasiveBlock;
  const templateId = slide.templateId || "twitter";

  if (isPersuasivo) {
    const elements = slide.persuasiveBlock!.elements;
    const hasImage = slide.imageUrl && !slide.imageUrl.startsWith("data:text/");
    const imageElIdx = elements.findIndex(e => e.type === "image");

    // Autoral template: clean editorial, no header
    if (templateId === "autoral") {
      const textEls = elements.filter(e => e.type === "text");
      const showImg = hasImage && elements.some(e => e.type === "image");

      // Adaptive font size based on text length
      const adaptiveBold = (text: string, hasImg: boolean) => {
        const len = text?.length || 0;
        if (hasImg) return len > 150 ? 38 : len > 80 ? 44 : 50;
        return len > 150 ? 42 : len > 80 ? 48 : 56;
      };
      const adaptiveRegular = (text: string, hasImg: boolean) => {
        const len = text?.length || 0;
        if (hasImg) return len > 200 ? 32 : 36;
        return len > 200 ? 36 : 40;
      };

      const slideFontFamily =
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      const baseSlideStyle = {
        width: 1080,
        height: 1350,
        backgroundColor: bgColor,
        display: "flex" as const,
        flexDirection: "column" as const,
        padding: 0,
        fontFamily: slideFontFamily,
        position: "relative" as const,
        overflow: "hidden" as const,
      };

      // HOOK SLIDE: full-bleed image + gradient + text overlay
      if (slide.isHook) {
        const hookBoldEls = textEls.filter(e => e.bold);
        const hookRegularEls = textEls.filter(e => !e.bold);
        const hookBoldText = hookBoldEls.map(e => e.content || "").join(" ");
        const hookFontSize = hookBoldText.length > 140 ? 40 : hookBoldText.length > 90 ? 46 : 54;

        return (
          <div className="carousel-slide" style={baseSlideStyle}>
            {/* Full-bleed background image */}
            {showImg && (
              <img
                src={slide.imageUrl}
                alt=""
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )}
            {/* Gradient overlay bottom 65% */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "65%",
                background: "linear-gradient(transparent, rgba(0,0,0,0.88))",
              }}
            />
            {/* Text content pinned to bottom */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "0 64px 60px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              {/* Main hook (bold text) */}
              {hookBoldEls.map((el, i) => (
                <p
                  key={`bold-${i}`}
                  style={{
                    fontSize: hookFontSize,
                    lineHeight: 1.08,
                    color: "#ffffff",
                    fontWeight: 900,
                    margin: 0,
                    marginBottom: 16,
                    textTransform: "uppercase" as const,
                    letterSpacing: -0.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {el.content}
                </p>
              ))}
              {/* Subtitle (regular text) */}
              {hookRegularEls.map((el, i) => (
                <p
                  key={`reg-${i}`}
                  style={{
                    fontSize: 28,
                    lineHeight: 1.3,
                    color: "#ffffff",
                    fontWeight: 500,
                    margin: 0,
                    textTransform: "uppercase" as const,
                    letterSpacing: 1,
                    opacity: 0.9,
                  }}
                >
                  {el.content}
                </p>
              ))}
              {/* Branding */}
              <div
                style={{
                  marginTop: 32,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {profile.headshotUrl && (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      overflow: "hidden",
                      flexShrink: 0,
                      border: "2px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    <img
                      src={profile.headshotUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                )}
                <span style={{ fontSize: 24, color: "#ffffff", fontWeight: 600 }}>
                  @{profile.handle}
                </span>
                {profile.verified && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={badgeColor}>
                    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        );
      }

      // CTA SLIDE: centered, bold accent text + avatar
      if (slide.isCTA) {
        return (
          <div className="carousel-slide" style={baseSlideStyle}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "80px 80px",
                textAlign: "center",
              }}
            >
              {profile.headshotUrl && (
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    overflow: "hidden",
                    marginBottom: 40,
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={profile.headshotUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}
              {textEls.map((el, i) => (
                <p
                  key={`text-${i}`}
                  style={{
                    fontSize: 52,
                    lineHeight: 1.2,
                    color: badgeColor,
                    fontWeight: 800,
                    margin: 0,
                    marginTop: i > 0 ? 20 : 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {el.content}
                </p>
              ))}
              <div
                style={{
                  marginTop: 48,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 24, color: secondaryColor, fontWeight: 500 }}>
                  @{profile.handle}
                </span>
                {profile.verified && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={badgeColor}>
                    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        );
      }

      // REGULAR CONTENT SLIDES
      const isTextOnly = !showImg;

      return (
        <div className="carousel-slide" style={baseSlideStyle}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: isTextOnly ? "80px 64px 64px" : "48px 64px 64px",
              justifyContent: isTextOnly ? "center" : "flex-start",
              minHeight: 0,
            }}
          >
            {elements.map((el, elIdx) => {
              if (el.type === "image") {
                if (!showImg) return null;
                return (
                  <div
                    key={`img-${elIdx}`}
                    style={{
                      marginTop: 28,
                      marginBottom: 28,
                      borderRadius: 16,
                      overflow: "hidden",
                      ...(slide.imageHeight
                        ? { height: slide.imageHeight, flexShrink: 0 }
                        : { flex: 1, minHeight: 250 }),
                    }}
                  >
                    <img
                      src={slide.imageUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                );
              }

              const content = el.content || "";
              const fontSize = el.bold
                ? adaptiveBold(content, !isTextOnly)
                : adaptiveRegular(content, !isTextOnly);

              return (
                <p
                  key={`text-${elIdx}`}
                  style={{
                    fontSize,
                    lineHeight: el.bold ? 1.18 : 1.4,
                    color: el.bold ? badgeColor : textColor,
                    fontWeight: el.bold ? 800 : 400,
                    margin: 0,
                    marginTop: elIdx === 0 ? 0 : 28,
                    flexShrink: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {content}
                </p>
              );
            })}
          </div>
        </div>
      );
    }

    // Principal template: header + accent bar on top
    if (templateId === "principal") {
      return (
        <div
          className="carousel-slide"
          style={{
            width: 1080,
            height: 1350,
            backgroundColor: bgColor,
            display: "flex",
            flexDirection: "column",
            padding: "0 64px 60px",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Accent bar on top */}
          <div
            style={{
              height: 6,
              backgroundColor: badgeColor,
              marginLeft: -64,
              marginRight: -64,
              flexShrink: 0,
            }}
          />

          {/* Profile header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 40,
              marginBottom: 28,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                backgroundColor: palette.avatarBg,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {profile.headshotUrl && (
                <img
                  src={profile.headshotUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: textColor }}>
                {profile.displayName}
              </span>
              {profile.verified && (
                <svg width="26" height="26" viewBox="0 0 24 24" fill={badgeColor}>
                  <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                </svg>
              )}
              <span style={{ fontSize: 28, color: secondaryColor }}>
                @{profile.handle}
              </span>
            </div>
          </div>

          {/* Elements */}
          {elements.map((el, elIdx) => {
            if (el.type === "image") {
              if (!hasImage) return null;
              return (
                <div
                  key={`img-${elIdx}`}
                  style={{
                    marginTop: 24,
                    marginBottom: 24,
                    borderRadius: 20,
                    overflow: "hidden",
                    ...(slide.imageHeight
                      ? { height: slide.imageHeight, flexShrink: 0 }
                      : { flex: 1, minHeight: 200 }),
                  }}
                >
                  <img
                    src={slide.imageUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              );
            }

            const principalTextOnly = !hasImage || imageElIdx === -1;

            return (
              <p
                key={`text-${elIdx}`}
                style={{
                  fontSize: el.bold
                    ? (principalTextOnly ? 52 : 48)
                    : (principalTextOnly ? 40 : 36),
                  lineHeight: el.bold ? 1.2 : 1.4,
                  color: el.bold ? badgeColor : textColor,
                  fontWeight: el.bold ? 800 : 400,
                  margin: 0,
                  marginTop: elIdx === 0 ? 0 : 24,
                  flexShrink: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {el.content}
              </p>
            );
          })}

          {imageElIdx === -1 && <div style={{ flex: 1 }} />}
        </div>
      );
    }

    // Futurista template: no header, centered text, minimal, larger font
    if (templateId === "futurista") {
      return (
        <div
          className="carousel-slide"
          style={{
            width: 1080,
            height: 1350,
            backgroundColor: bgColor,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "80px 80px",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: "relative",
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          {elements.map((el, elIdx) => {
            if (el.type === "image") {
              if (!hasImage) return null;
              return (
                <div
                  key={`img-${elIdx}`}
                  style={{
                    marginTop: 28,
                    marginBottom: 28,
                    borderRadius: 20,
                    overflow: "hidden",
                    width: "100%",
                    ...(slide.imageHeight
                      ? { height: slide.imageHeight, flexShrink: 0 }
                      : { maxHeight: 500 }),
                  }}
                >
                  <img
                    src={slide.imageUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              );
            }

            return (
              <p
                key={`text-${elIdx}`}
                style={{
                  fontSize: el.bold ? 48 : 38,
                  lineHeight: el.bold ? 1.2 : 1.4,
                  color: el.bold ? badgeColor : textColor,
                  fontWeight: el.bold ? 700 : 400,
                  margin: 0,
                  marginTop: elIdx === 0 ? 0 : 24,
                  flexShrink: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {el.content}
              </p>
            );
          })}
        </div>
      );
    }

    // Default Twitter template (persuasivo)
    return (
      <div
        className="carousel-slide"
        style={{
          width: 1080,
          height: 1350,
          backgroundColor: bgColor,
          display: "flex",
          flexDirection: "column",
          padding: "60px 64px 60px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Profile header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              backgroundColor: palette.avatarBg,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {profile.headshotUrl && (
              <img
                src={profile.headshotUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: textColor }}>
              {profile.displayName}
            </span>
            {profile.verified && (
              <svg width="26" height="26" viewBox="0 0 24 24" fill={badgeColor}>
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
              </svg>
            )}
            <span style={{ fontSize: 28, color: secondaryColor }}>
              @{profile.handle}
            </span>
          </div>
        </div>

        {/* Render elements in order */}
        {elements.map((el, elIdx) => {
          if (el.type === "image") {
            if (!hasImage) return null;
            return (
              <div
                key={`img-${elIdx}`}
                style={{
                  marginTop: 24,
                  marginBottom: 24,
                  borderRadius: 20,
                  overflow: "hidden",
                  ...(slide.imageHeight
                    ? { height: slide.imageHeight, flexShrink: 0 }
                    : { flex: 1, minHeight: 200 }),
                }}
              >
                <img
                  src={slide.imageUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            );
          }

          const twitterTextOnly = !hasImage || imageElIdx === -1;

          return (
            <p
              key={`text-${elIdx}`}
              style={{
                fontSize: el.bold
                  ? (twitterTextOnly ? 48 : 44)
                  : (twitterTextOnly ? 38 : 34),
                lineHeight: el.bold ? 1.2 : 1.4,
                color: textColor,
                fontWeight: el.bold ? 700 : 400,
                margin: 0,
                marginTop: elIdx === 0 ? 0 : 20,
                flexShrink: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {el.content}
            </p>
          );
        })}

        {/* Fill remaining space if no image */}
        {imageElIdx === -1 && <div style={{ flex: 1 }} />}
      </div>
    );
  }

  // Default Informativo layout
  return (
    <div
      className="carousel-slide"
      style={{
        width: 1080,
        height: 1350,
        backgroundColor: bgColor,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        padding: "80px 64px 60px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >

      {/* Tweets container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: slide.tweets.length > 1 ? 0 : 32,
          flex: 1,
          justifyContent: "center",
        }}
      >
        {slide.tweets.map((tweet, tweetIndex) => (
          <div key={tweetIndex}>
            {/* Divider between combined tweets */}
            {tweetIndex > 0 && (
              <div
                style={{
                  height: 1,
                  backgroundColor: dividerColor,
                  margin: "36px 0",
                }}
              />
            )}

            {/* Profile row — name + badge + handle on same line */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: palette.avatarBg,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {profile.headshotUrl && (
                  <img
                    src={profile.headshotUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>

              {/* Name + badge + handle — same line like X.com */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: textColor,
                  }}
                >
                  {profile.displayName}
                </span>
                {profile.verified && (
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill={badgeColor}
                  >
                    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                  </svg>
                )}
                <span
                  style={{
                    fontSize: 30,
                    color: secondaryColor,
                  }}
                >
                  @{profile.handle}
                </span>
              </div>
            </div>

            {/* Tweet text */}
            <p
              style={{
                fontSize: 40,
                lineHeight: 1.45,
                color: textColor,
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {tweet.text}
            </p>
          </div>
        ))}

        {/* Slide image */}
        {slide.imageUrl && !slide.imageUrl.startsWith("data:text/") && (
          <div
            style={{
              marginTop: 36,
              borderRadius: 20,
              overflow: "hidden",
              maxHeight: slide.imageHeight || (slide.tweets[0].text.length > 200 ? 400 : 550),
            }}
          >
            <img
              src={slide.imageUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
