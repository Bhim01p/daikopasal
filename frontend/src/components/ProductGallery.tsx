import SafeImage from "./SafeImage";
import { useT } from "../context/LanguageContext";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "../types";
import { productImages, productImageSource } from "../utils/products";
import { ProductImage } from "./ProductCard";

export default function ProductGallery({ product }: { product: Product }) {
  const t = useT();
  const productSpecificImages = productImages(product);
  const hasActualUsedPhotos = product.category === "used" && productSpecificImages.some((image) => image.startsWith("/api/images/upload-"));
  const catalogueImages = product.image === "/assets/phone.svg" ? (product.catalogueImage?.images || []) : [];
  const images = catalogueImages.length ? catalogueImages.map((image) => image.url) : productSpecificImages;
  const signature = images.join("|");
  const [selected, setSelected] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const tiltFrame = useRef<number | null>(null);
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function resetTilt() {
    if (tiltFrame.current !== null) cancelAnimationFrame(tiltFrame.current);
    tiltFrame.current = null;
    rail.current?.style.removeProperty("--detail-tilt-x");
    rail.current?.style.removeProperty("--detail-tilt-y");
  }
  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || reducedMotion() || images[selected]?.endsWith(".svg")) return;
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (tiltFrame.current !== null) cancelAnimationFrame(tiltFrame.current);
    tiltFrame.current = requestAnimationFrame(() => {
      target.style.setProperty("--detail-tilt-x", `${Math.max(-3, Math.min(3, x * 3))}deg`);
      target.style.setProperty("--detail-tilt-y", `${Math.max(-2, Math.min(2, y * -2))}deg`);
    });
  }
  useEffect(() => () => resetTilt(), [product.id, signature]);
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
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        onPointerCancel={resetTilt}
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
            className={`detail-image product-gallery-frame${selected === index ? " gallery-frame-active" : ""}${image.endsWith(".svg") ? " gallery-frame-placeholder" : ""}`}
            key={image}
            data-selected={selected === index ? "true" : "false"}
            role="group"
            aria-label={t("Photo {{v0}} of {{v1}}", {
              v0: String(index + 1),
              v1: String(images.length),
            })}
          >
            <ProductImage
              product={{ ...product, image }}
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
            />
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
      {product.category === "used" && (hasActualUsedPhotos ? (
        <p className="used-photo-trust">{t("Actual device photos")}</p>
      ) : (
        <p className="image-disclaimer">{t("Reference image — actual device photos not available")}</p>
      ))}
      {catalogueImages[selected]?.attributionRequired && catalogueImages[selected]?.sourceUrl && (
        <p className="image-attribution">
          <a href={catalogueImages[selected].sourceUrl} target="_blank" rel="noreferrer">
            {t("Image source")}
          </a>
          {catalogueImages[selected].license ? ` · ${catalogueImages[selected].license}` : ""}
        </p>
      )}
    </section>
  );
}
