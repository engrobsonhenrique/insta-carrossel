"use client";

import { SlideData, ProfileConfig } from "@/lib/types";

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
  const isDark = profile.theme === "dark";
  const bgColor = isDark ? "#15202b" : "#ffffff";
  const textColor = isDark ? "#e7e9ea" : "#0f1419";
  const secondaryColor = isDark ? "#8b98a5" : "#536471";
  const dividerColor = isDark ? "#38444d" : "#eff3f4";
  const badgeColor = "#1d9bf0";

  const isPersuasivo = slide.contentStyle === "persuasivo" && slide.persuasiveBlock;

  if (isPersuasivo) {
    const elements = slide.persuasiveBlock!.elements;
    const hasImage = slide.imageUrl && !slide.imageUrl.startsWith("data:text/");
    // Find the image element index to know which element gets flex:1
    const imageElIdx = elements.findIndex(e => e.type === "image");

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
              backgroundColor: isDark ? "#38444d" : "#cfd9de",
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
                  flex: 1,
                  minHeight: 0,
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
                fontSize: el.bold ? 36 : 34,
                lineHeight: el.bold ? 1.3 : 1.4,
                color: textColor,
                fontWeight: el.bold ? 700 : 400,
                margin: 0,
                marginTop: elIdx === 0 ? 0 : 16,
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
                  backgroundColor: isDark ? "#38444d" : "#cfd9de",
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
              maxHeight: slide.tweets[0].text.length > 200 ? 400 : 550,
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
