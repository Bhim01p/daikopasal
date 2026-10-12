import { useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { useT } from "../context/LanguageContext";

export default function SafeImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const t = useT();
  const [failedSource, setFailedSource] = useState<string>();
  if (!props.src || failedSource === props.src)
    return (
      <span
        className={`image-fallback ${props.className || ""}`}
        role="img"
        aria-label={props.alt || t("Photo unavailable")}
      >
        <ImageOff size={30} aria-hidden="true" />
        <span>{t("Photo unavailable")}</span>
      </span>
    );
  return <img {...props} onError={() => setFailedSource(props.src)} />;
}
