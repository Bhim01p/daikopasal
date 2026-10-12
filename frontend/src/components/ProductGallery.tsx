import SafeImage from "./SafeImage";
import { useT } from "../context/LanguageContext";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "../types";
import { productImages, productImageSource } from "../utils/products";
import { ProductImage } from "./ProductCard";

export default function ProductGallery({ product }: { product: Product }) {
  const t = useT();
  const images = productImages(product);
  const signature = images.join("|");
  const [selected, setSelected] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setSelected(0);
    if (rail.current) rail.current.scrollLeft = 0;
  }, [product.id, signature]);
  function show(index: number) {
    if (!rail.current || index < 0 || index >= images.length) return;
    setSelected(index);
    rail.current.scrollTo({
      left: index * rail.current.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <section
      className="product-gallery"
      aria-label={t("{{v0}} photos", { v0: String(product.name) })}
    >
      <div
        className="product-gallery-rail"
        ref={rail}
        tabIndex={images.length > 1 ? 0 : undefined}
        aria-label={t("Product photos. Swipe to browse.")}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            show(selected + (event.key === "ArrowRight" ? 1 : -1));
          }
        }}
        onScroll={(event) => {
          const target = event.currentTarget;
          setSelected(
            Math.min(
              images.length - 1,
              Math.max(0, Math.round(target.scrollLeft / target.clientWidth)),
            ),
          );
        }}
      >
        {images.map((image, index) => (
          <div
            className="detail-image product-gallery-frame"
            key={image}
            role="group"
            aria-label={t("Photo {{v0}} of {{v1}}", {
              v0: String(index + 1),
              v1: String(images.length),
            })}
          >
            <ProductImage product={{ ...product, image }} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <div className="product-gallery-controls">
            <button
              className="icon-button"
              aria-label={t("Previous product photo")}
              disabled={selected === 0}
              onClick={() => show(selected - 1)}
            >
              <ChevronLeft size={22} />
            </button>
            <p aria-live="polite">
              {t("Photo ")}
              {selected + 1} {t(" of ")}
              {images.length}
              <span>{t("Swipe or choose a photo below")}</span>
            </p>
            <button
              className="icon-button"
              aria-label={t("Next product photo")}
              disabled={selected === images.length - 1}
              onClick={() => show(selected + 1)}
            >
              <ChevronRight size={22} />
            </button>
          </div>
          <div
            className="product-gallery-thumbnails"
            aria-label={t("Choose a product photo")}
          >
            {images.map((image, index) => (
              <button
                key={image}
                className={selected === index ? "selected" : ""}
                aria-label={t("View product photo {{v0}}", {
                  v0: String(index + 1),
                })}
                aria-pressed={selected === index}
                onClick={() => show(index)}
              >
                <SafeImage
                  src={productImageSource({ ...product, image })}
                  alt=""
                  loading="lazy"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </>
      )}
      {images[selected]?.endsWith(".svg") && (
        <p className="image-disclaimer">
          {t(
            "Illustrative placeholder. Actual product photos can be added by the shop.",
          )}
        </p>
      )}
    </section>
  );
}
