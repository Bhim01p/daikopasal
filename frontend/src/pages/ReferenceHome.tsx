import SafeImage from "../components/SafeImage";
import { useT } from "../context/LanguageContext";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ReferenceHome() {
  const t = useT();
  const slides = [
    {
      title: "New and used phones",
      description: "Find your next phone or a pre-owned option.",
      links: [{ to: "/mobiles", label: "New phones" }, { to: "/second-hand", label: "Used phones" }],
      image: "/assets/catalogue-iphone-15.png",
    },
    {
      title: "Phone and meter repair",
      description: "Help for your phone or vehicle meter.",
      links: [{ to: "/repair#phone-repairs", label: "Phone repair" }, { to: "/repair#digital-meter-repairs", label: "Digital meter repair" }],
      image: "/assets/pulsar-meter-repair.png",
    },
    {
      title: "Accessories",
      description: "Everyday essentials",
      links: [{ to: "/accessories", label: "Explore category" }],
      image: "/assets/catalogue-redmi-buds-6-play.jpg",
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
  const move = (n: number) => { pauseUntil.current = Date.now() + 3000; setIndex((i) => (i + n + slides.length) % slides.length); };
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !drag.current && !paused.current && Date.now() > pauseUntil.current)
        setIndex((i) => (i + 1) % slides.length);
    }, 3000);
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
        onMouseEnter={() => { if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) paused.current = true; }}
        onMouseLeave={() => { paused.current = false; }}
        onFocusCapture={() => { if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) paused.current = true; }}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) paused.current = false; }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            move(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "touch" && e.button === 0) { drag.current = { x: e.clientX, y: e.clientY }; }
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "touch") return;
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
        }}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          drag.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(e) => {
          const start = drag.current;
          const touch = e.changedTouches[0];
          drag.current = null;
          if (start && touch && Math.abs(touch.clientX - start.x) > 45 && Math.abs(touch.clientX - start.x) > Math.abs(touch.clientY - start.y) * 1.25) {
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
          <SafeImage
            className="reference-banner-photo"
            src={slide.image}
            alt={t(slide.title)}
            fetchPriority="high"
            draggable={false}
          />
          <div className="hero-copy">
            <span className="eyebrow">{t("Machhapuchhree Electronics")}</span>
            <h1>{t(slide.title)}</h1>
            <p>{t(slide.description)}</p>
            <div className="home-slide-links">{slide.links.map((link) => <Link key={link.to} className="button dark" to={link.to}>{t(link.label)} <ArrowRight size={17} /></Link>)}</div>
          </div>
        </div>
      </section>
    </>
  );
}
