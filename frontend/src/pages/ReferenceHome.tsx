import SafeImage from "../components/SafeImage";
import { useT } from "../context/LanguageContext";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ReferenceHome() {
  const t = useT();
  const slides = [
    {
      title: "New phones",
      description: "Find your next phone.",
      to: "/mobiles",
      image: "/assets/catalogue-iphone-15.png",
    },
    {
      title: "Used phones",
      description: "More options for your budget",
      to: "/second-hand",
      image: "/assets/catalogue-redmi-9.png",
    },
    {
      title: "Accessories",
      description: "Everyday essentials",
      to: "/accessories",
      image: "/assets/catalogue-redmi-buds-6-play.jpg",
    },
    {
      title: "Digital meter repair",
      description: "Bike or vehicle meter trouble? Let us take a look.",
      to: "/repair",
      image: "/assets/pulsar-meter-repair.png",
    },
  ];
  const [index, setIndex] = useState(0);
  const carousel = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = carousel.current;
    if (!section) return;
    const measure = () => {
      const header = document.querySelector(".site-header");
      const tabs = document.querySelector(".home-tabs");
      const dock = document.querySelector(".mobile-dock");
      section.style.setProperty(
        "--home-top-height",
        `${(header?.getBoundingClientRect().height || 0) + (tabs?.getBoundingClientRect().height || 0)}px`,
      );
      section.style.setProperty(
        "--home-dock-height",
        `${dock?.getBoundingClientRect().height || 64}px`,
      );
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
  const paused = useRef(false);
  const pauseUntil = useRef(0);
  const move = (n: number) => { pauseUntil.current = Date.now() + 8000; setIndex((i) => (i + n + slides.length) % slides.length); };
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !drag.current && !paused.current && Date.now() > pauseUntil.current)
        setIndex((i) => (i + 1) % 4);
    }, 5000);
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
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; }}
        onFocusCapture={() => { paused.current = true; }}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) paused.current = false; }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            move(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
        onPointerDown={(e) => {
          if (e.button === 0) { drag.current = { x: e.clientX, y: e.clientY }; pauseUntil.current = Date.now() + 8000; }
        }}
        onPointerMove={(e) => {
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
        }}
        onLostPointerCapture={() => {
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
          className={`hero reference-banner-main ${index === 1 ? "used-slide" : ""} ${index === 3 ? "repair-slide" : ""}`}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} / 4: ${t(slide.title)}`}
        >
          <SafeImage
            className="reference-banner-photo"
            src={slide.image}
            alt=""
            fetchPriority="high"
            draggable={false}
          />
          <div className="hero-copy">
            <span className="eyebrow">{t("Machhapuchhree Electronics")}</span>
            <h1>{t(slide.title)}</h1>
            <p>{t(slide.description)}</p>
            <Link className="button dark" to={slide.to}>
              {t(index === 3 ? "Ask about meter repair" : "Explore category")} <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
