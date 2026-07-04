import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LeadForm } from "@/components/site/LeadForm";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Rupee Catalyst — Talk to a Financial Expert" },
      { name: "description", content: "Talk to a Rupee Catalyst expert for loans, balance transfer or mutual fund advisory. Call, WhatsApp or visit our office." },
      { property: "og:title", content: "Contact | Rupee Catalyst" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const wa = SITE.whatsapp.replace(/[^0-9]/g, "");
  return (
    <>
      <section className="bg-gradient-hero py-14 md:py-20 text-navy-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">Let's talk</h1>
          <p className="mx-auto mt-3 max-w-2xl text-navy-foreground/85">
            Have a question or need a recommendation? Our experts are ready to help.
          </p>
        </div>
      </section>
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <Card className="p-6 shadow-card">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 size-5 text-royal" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Call us</p>
                  <a href={`tel:${SITE.phone}`} className="font-display text-lg font-bold text-navy hover:text-royal">{SITE.phone}</a>
                </div>
              </div>
            </Card>
            <Card className="p-6 shadow-card">
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 size-5 text-emerald" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">WhatsApp</p>
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener" className="font-display text-lg font-bold text-navy hover:text-emerald">Chat with us</a>
                </div>
              </div>
            </Card>
            <Card className="p-6 shadow-card">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 text-royal" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
                  <a href={`mailto:${SITE.email}`} className="font-display text-lg font-bold text-navy hover:text-royal break-all">{SITE.email}</a>
                </div>
              </div>
            </Card>
            <Card className="p-6 shadow-card">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 text-royal" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Visit our office</p>
                  <p className="text-sm text-foreground/85 mt-1">{SITE.address}</p>
                </div>
              </div>
            </Card>
          </div>
          <LeadForm title="Send us a message" subtitle="We typically respond within 30 minutes." ctaLabel="Get Best Offer" />
        </div>
      </section>
    </>
  );
}
