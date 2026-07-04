import { MessageCircle, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

export function FloatingActions() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", on, { passive: true });
    on();
    return () => window.removeEventListener("scroll", on);
  }, []);

  const wa = SITE.whatsapp.replace(/[^0-9]/g, "");

  return (
    <div className="fixed bottom-20 right-4 z-30 flex flex-col items-end gap-3 sm:bottom-4">
      {show && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="hidden sm:grid place-items-center rounded-full bg-navy text-navy-foreground p-3 shadow-elevated hover:bg-royal transition-colors"
        >
          <ArrowUp className="size-4" />
        </button>
      )}
      <a
        href={`https://wa.me/${wa}`}
        target="_blank"
        rel="noopener"
        aria-label="WhatsApp"
        className="rounded-full bg-emerald text-emerald-foreground p-3.5 shadow-elevated hover:brightness-110"
      >
        <MessageCircle className="size-5" />
      </a>
    </div>
  );
}
