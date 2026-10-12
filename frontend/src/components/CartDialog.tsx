import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useT } from "../context/LanguageContext";
import Cart from "../pages/Cart";

export default function CartDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    element.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="account-dialog cart-dialog"
      aria-label={t("Your shopping cart.")}
      onCancel={onClose}
      onClickCapture={(event) => {
        if ((event.target as Element).closest("a[href]")) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <button
        className="icon-button dialog-close"
        aria-label={t("Close cart window")}
        onClick={onClose}
      >
        <X size={22} />
      </button>
      <Cart />
    </dialog>
  );
}
