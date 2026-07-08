import { SectionContainer } from "@/components/marketing/section-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aboutContent } from "@/config/content";

export function AboutPageContent() {
  return (
    <>
      <SectionContainer className="pt-12 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{aboutContent.headline}</h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">{aboutContent.intro}</p>
        </div>
      </SectionContainer>

      <SectionContainer className="pt-0 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {aboutContent.pillars.map((pillar) => (
            <Card key={pillar.title} className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">{pillar.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionContainer>
    </>
  );
}
