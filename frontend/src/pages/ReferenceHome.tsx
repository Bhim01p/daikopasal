import SafeImage from "../components/SafeImage";
import { useT } from "../context/LanguageContext";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function ReferenceHome() {
  const t = useT();
  const slides = [
    {
      title: "New and used phones",
      description: "Find your next phone or a pre-owned option.",
      links: [
        { to: "/mobiles", label: "New phones" },
        { to: "/second-hand", label: "Used phones" },
      ],
      image: "/assets/catalogue-iphone-15-1000.webp",
      srcSet:
        "/assets/catalogue-iphone-15-640.webp 640w, /assets/catalogue-iphone-15-1000.webp 1000w",
      sizes: "(max-width: 767px) 88vw, 60vw",
      width: 1000,
      height: 1000,
    },
    {
      title: "Phone and meter repair",
      description: "Help for your phone or vehicle meter.",
      links: [
        { to: "/repair#phone-repairs", label: "Phone repair" },
        { to: "/repair#digital-meter-repairs", label: "Digital meter repair" },
      ],
      image: "/assets/pulsar-meter-repair-1280.webp",
      srcSet:
        "/assets/pulsar-meter-repair-640.webp 640w, /assets/pulsar-meter-repair-1280.webp 1280w",
      sizes: "100vw",
      width: 1672,
      height: 941,
    },
    {
      title: "Accessories",
      description: "Everyday essentials",
      links: [{ to: "/accessories", label: "Explore category" }],
      image: "/assets/catalogue-redmi-buds-6-play-1280.webp",
      srcSet:
        "/assets/catalogue-redmi-buds-6-play-640.webp 640w, /assets/catalogue-redmi-buds-6-play-1280.webp 1280w",
      sizes: "(max-width: 767px) 88vw, 60vw",
      width: 2560,
      height: 1400,
    },
  ];
  const [index, setIndex] = useState(0);
  const carousel = useRef<HTMLElement>(null);
  const heroVisual = useRef<HTMLDivElement>(null);
  const tiltFrame = useRef<number | null>(null);
  useLayoutEffect(() => {
    const section = carousel.current;
    if (!section) return;
    const measure = () => {
      const header = document.querySelector(".site-header");
      const tabs = document.querySelector(".home-tabs");
      const dock = document.querySelector(".mobile-dock");
      const topHeight =
        (header?.getBoundingClientRect().height || 0) +
        (tabs?.getBoundingClientRect().height || 0);
      const dockHeight = dock?.getBoundingClientRect().height || 64;
      section.style.setProperty("--home-top-height", `${topHeight}px`);
      section.style.setProperty("--home-dock-height", `${dockHeight}px`);
    };
    const observer = new ResizeObserver(measure);
    for (const selector of [".site-header", ".home-tabs", ".mobile-dock"]) {
      const element = document.querySelector(selector);
      if (element) observer.observe(element);
    }
    measure();
    return () => observer.disconnect();
  }, []);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const suppress = useRef(0);
  const interactionPaused = useRef(false);
  const manualPaused = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const pauseUntil = useRef(0);
  const move = (n: number) => {
    pauseUntil.current = Date.now() + 6000;
    setIndex((i) => (i + n + slides.length) % slides.length);
  };
  const select = (nextIndex: number) => {
    pauseUntil.current = Date.now() + 6000;
    setIndex(nextIndex);
  };
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !drag.current &&
        !interactionPaused.current &&
        !manualPaused.current &&
        Date.now() > pauseUntil.current
      )
        setIndex((i) => (i + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);
  const slide = slides[index];
  return (
    <>
      {" "}
      <section
        ref={carousel}
        className="home-carousel"
        aria-roledescription="carousel"
        aria-label={t("Shop categories")}
        tabIndex={0}
        onMouseEnter={() => {
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches)
            interactionPaused.current = true;
        }}
        onMouseLeave={() => {
          interactionPaused.current = false;
        }}
        onFocusCapture={() => {
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches)
            interactionPaused.current = true;
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            interactionPaused.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            move(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "touch" && e.button === 0) {
            drag.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "touch") return;
          if (
            window.matchMedia(
              "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
            ).matches &&
            heroVisual.current
          ) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            if (tiltFrame.current) cancelAnimationFrame(tiltFrame.current);
            tiltFrame.current = requestAnimationFrame(() => {
              heroVisual.current?.style.setProperty(
                "--hero-tilt-x",
                `${(-y * 4).toFixed(2)}deg`,
              );
              heroVisual.current?.style.setProperty(
                "--hero-tilt-y",
                `${(x * 6).toFixed(2)}deg`,
              );
            });
          }
          const d = drag.current;
          if (
            d &&
            Math.abs(e.clientX - d.x) > 12 &&
            Math.abs(e.clientX - d.x) > Math.abs(e.clientY - d.y)
          ) {
            e.currentTarget.setPointerCapture(e.pointerId);
            suppress.current = Date.now() + 500;
          }
        }}
        onPointerUp={(e) => {
          if (e.pointerType === "touch") return;
          const d = drag.current;
          drag.current = null;
          if (
            d &&
            Math.abs(e.clientX - d.x) > 50 &&
            Math.abs(e.clientX - d.x) > Math.abs(e.clientY - d.y)
          )
            move(e.clientX < d.x ? 1 : -1);
        }}
        onPointerCancel={() => {
          drag.current = null;
          if (heroVisual.current) {
            heroVisual.current.style.setProperty("--hero-tilt-x", "0deg");
            heroVisual.current.style.setProperty("--hero-tilt-y", "0deg");
          }
        }}
        onPointerLeave={() => {
          if (heroVisual.current) {
            heroVisual.current.style.setProperty("--hero-tilt-x", "0deg");
            heroVisual.current.style.setProperty("--hero-tilt-y", "0deg");
          }
        }}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          drag.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(e) => {
          const start = drag.current;
          const touch = e.changedTouches[0];
          drag.current = null;
          if (
            start &&
            touch &&
            Math.abs(touch.clientX - start.x) > 45 &&
            Math.abs(touch.clientX - start.x) >
              Math.abs(touch.clientY - start.y) * 1.25
          ) {
            suppress.current = Date.now() + 500;
            move(touch.clientX < start.x ? 1 : -1);
          }
        }}
        onLostPointerCapture={(e) => {
          if (e.pointerType === "touch") return;
          drag.current = null;
        }}
        onClickCapture={(e) => {
          if (Date.now() < suppress.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div
          className={`hero reference-banner-main ${index === 1 ? "repair-slide" : ""}`}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} / ${slides.length}: ${t(slide.title)}`}
        >
          <div
            key={`visual-${index}`}
            ref={heroVisual}
            className="reference-banner-visual"
          >
            <SafeImage
              className="reference-banner-photo"
              src={slide.image}
              alt={t(slide.title)}
              srcSet={slide.srcSet}
              sizes={slide.sizes}
              width={slide.width}
              height={slide.height}
              loading="eager"
              fetchPriority={index === 0 ? "high" : "auto"}
              draggable={false}
            />
          </div>
          <div key={`copy-${index}`} className="hero-copy">
            <span className="eyebrow">{t("Machhapuchhree Electronics")}</span>
            <h1>{t(slide.title)}</h1>
            <p>{t(slide.description)}</p>
            <div className="home-slide-links">
              {slide.links.map((link) => (
                <Link key={link.to} className="button dark" to={link.to}>
                  {t(link.label)} <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          </div>
          <div
            className="home-carousel-controls"
            role="group"
            aria-label={t("Shop categories")}
          >
            <button
              className="home-carousel-arrow"
              type="button"
              aria-label={t("Previous category")}
              onClick={() => move(-1)}
            >
              <ChevronLeft size={19} aria-hidden="true" />
            </button>
            <div className="home-carousel-dots">
              {slides.map((item, dotIndex) => (
                <button
                  key={item.title}
                  className={`home-carousel-dot${dotIndex === index ? " active" : ""}`}
                  type="button"
                  aria-label={t("Show slide {{v0}}", { v0: dotIndex + 1 })}
                  aria-current={dotIndex === index ? "true" : undefined}
                  onClick={() => select(dotIndex)}
                />
              ))}
            </div>
            <button
              className="home-carousel-arrow"
              type="button"
              aria-label={t("Next category")}
              onClick={() => move(1)}
            >
              <ChevronRight size={19} aria-hidden="true" />
            </button>
            <button
              className="home-carousel-arrow home-carousel-toggle"
              type="button"
              aria-label={t(isPaused ? "Play slideshow" : "Pause slideshow")}
              aria-pressed={isPaused}
              onClick={() => {
                manualPaused.current = !manualPaused.current;
                setIsPaused(manualPaused.current);
              }}
            >
              {isPaused ? (
                <Play size={16} aria-hidden="true" />
              ) : (
                <Pause size={16} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
