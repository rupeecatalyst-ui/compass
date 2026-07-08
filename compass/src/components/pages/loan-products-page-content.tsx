import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loanProducts } from "@/config/content";
import { ROUTES } from "@/constants/routes";

export function LoanProductsPageContent() {
  return (
    <>
      <SectionContainer className="pt-12 sm:pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Loan Products</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Every product backed by intelligent matching and expert execution.
          </p>
        </div>
      </SectionContainer>

      <SectionContainer className="pt-0">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loanProducts.map((product) => (
            <Card key={product.id} className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{product.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                <Button variant="ghost" size="sm" className="px-0 text-primary" asChild>
                  <Link href={ROUTES.CONTACT}>
                    Learn More <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionContainer>
    </>
  );
}
