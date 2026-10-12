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
      image: "/assets/shop-banner-v1.png",
    },
    {
      title: "Used phones",
      description: "More options for your budget",
      to: "/second-hand",
      image: "/assets/sample-phone-v1.png",
    },
    {
      title: "Accessories",
      description: "Everyday essentials",
      to: "/accessories",
      image: "/assets/accessories-banner-v1.png",
    },
  ];
  const [index, setIndex] = useState(0);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const suppress = useRef(0);
  const move = (n: number) => setIndex((i) => (i + n + 3) % 3);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !drag.current)
        setIndex((i) => (i + 1) % 3);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);
  const slide = slides[index];
  return (
    <section
      className="home-carousel"
      aria-roledescription="carousel"
      aria-label={t("Shop categories")}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          move(e.key === "ArrowRight" ? 1 : -1);
        }
      }}
      onPointerDown={(e) => {
        if (e.button === 0) drag.current = { x: e.clientX, y: e.clientY };
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
        className={`hero reference-banner-main ${index === 1 ? "used-slide" : ""}`}
        role="group"
        aria-roledescription="slide"
        aria-label={`${index + 1} / 3: ${t(slide.title)}`}
      >
        <img
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
            {t("Explore category")} <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
