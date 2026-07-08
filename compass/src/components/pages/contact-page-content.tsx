import { Mail, MapPin, Phone } from "lucide-react";
import { SectionContainer } from "@/components/marketing/section-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contactContent } from "@/config/content";
import { siteConfig } from "@/config/site";

export function ContactPageContent() {
  return (
    <SectionContainer className="pt-12 sm:pt-16 pb-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{contactContent.headline}</h1>
        <p className="mt-6 text-lg text-muted-foreground">{contactContent.intro}</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4 text-primary" /> Email</CardTitle>
          </CardHeader>
          <CardContent>
            <a href={`mailto:${siteConfig.contactEmail}`} className="text-sm text-muted-foreground hover:text-foreground">
              {siteConfig.contactEmail}
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Phone className="h-4 w-4 text-primary" /> Phone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{siteConfig.contactPhone}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-primary" /> Office</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Mumbai, India</p>
          </CardContent>
        </Card>
      </div>
    </SectionContainer>
  );
}
