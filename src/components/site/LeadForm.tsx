import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitLead } from "@/lib/lead-capture";
import { PRODUCTS } from "@/lib/site";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().max(100).optional().or(z.literal("")),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required").max(80),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .regex(/^\d+$/, "Numbers only"),
  product: z.string().min(1, "Select a product"),
  occupation: z.string().trim().max(60).optional().or(z.literal("")),
  monthly_income: z.string().trim().regex(/^\d*$/, "Numbers only").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface LeadFormProps {
  variant?: "card" | "inline";
  defaultProduct?: string;
  amountLabel?: string;
  ctaLabel?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  compact?: boolean;
  benefits?: string[];
  badge?: string;
}

export function LeadForm({
  variant = "card",
  defaultProduct,
  amountLabel = "Loan Amount (₹)",
  ctaLabel = "Get Best Offer",
  title = "Get a personalised quote",
  subtitle = "Our expert will call you within 30 minutes",
  className,
  compact = false,
  benefits,
  badge = "Quick Apply",
}: LeadFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      product: defaultProduct ?? PRODUCTS[0].slug,
      name: "",
      email: "",
      occupation: "",
      monthly_income: "",
    },
  });

  const product = watch("product");

  async function onSubmit(data: FormData) {
    try {
      await submitLead({
        product: data.product,
        name: data.name || undefined,
        mobile: data.mobile,
        email: data.email || undefined,
        city: data.city,
        loan_amount: data.product === "mutual-funds" ? undefined : Number(data.amount),
        sip_amount: data.product === "mutual-funds" ? Number(data.amount) : undefined,
        occupation: data.occupation || undefined,
        monthly_income: data.monthly_income ? Number(data.monthly_income) : undefined,
      });
      toast.success("Thank you! Our expert will contact you shortly.");
      setSubmitted(true);
    } catch (e) {
      toast.error("Could not submit. Please try again.");
      console.error(e);
    }
  }

  if (submitted) {
    return (
      <div
        className={cn(
          "rounded-2xl p-8 text-center",
          variant === "card" ? "bg-white shadow-elevated" : "bg-emerald/10 border border-emerald/30",
          className,
        )}
      >
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-emerald/15 text-emerald">
          <CheckCircle2 className="size-7" />
        </div>
        <h3 className="font-display text-xl font-bold text-navy">We've got your details!</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A relationship manager will reach out within 30 minutes.
        </p>
      </div>
    );
  }

  const isMF = product === "mutual-funds";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        "rounded-2xl",
        variant === "card" ? "bg-white p-6 shadow-elevated md:p-7" : "p-0",
        className,
      )}
    >
      {variant === "card" && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-cta">{badge}</p>
          <h3 className="mt-1 font-display text-xl font-extrabold text-navy md:text-2xl">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {!defaultProduct && (
          <div className="md:col-span-2">
            <Label htmlFor="lf-product" className="text-xs font-semibold text-navy">Product *</Label>
            <Select
              value={product}
              onValueChange={(v) => setValue("product", v, { shouldValidate: true })}
            >
              <SelectTrigger id="lf-product" className="mt-1.5 h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTS.map((p) => (
                  <SelectItem key={p.slug} value={p.slug} className="text-base py-3">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="lf-mobile" className="text-xs font-semibold text-navy">Mobile Number *</Label>
          <Input
            id="lf-mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            enterKeyHint="next"
            maxLength={10}
            placeholder="10-digit mobile"
            className="mt-1.5 h-12 text-base"
            {...register("mobile")}
          />
          {errors.mobile && <p className="mt-1 text-xs text-destructive">{errors.mobile.message}</p>}
        </div>
        <div>
          <Label htmlFor="lf-amount" className="text-xs font-semibold text-navy">
            {isMF ? "Monthly SIP (₹) *" : `${amountLabel} *`}
          </Label>
          <Input
            id="lf-amount"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="next"
            placeholder={isMF ? "e.g. 10000" : "e.g. 2500000"}
            className="mt-1.5 h-12 text-base"
            {...register("amount")}
          />
          {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div>
          <Label htmlFor="lf-city" className="text-xs font-semibold text-navy">City *</Label>
          <Input
            id="lf-city"
            autoComplete="address-level2"
            enterKeyHint="next"
            placeholder="e.g. Mumbai"
            className="mt-1.5 h-12 text-base"
            {...register("city")}
          />
          {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city.message}</p>}
        </div>
        <div>
          <Label htmlFor="lf-name" className="text-xs font-semibold text-navy">Name</Label>
          <Input
            id="lf-name"
            autoComplete="name"
            enterKeyHint="done"
            placeholder="Full name (optional)"
            className="mt-1.5 h-12 text-base"
            {...register("name")}
          />
        </div>


        {!compact && (
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => setShowMore((s) => !s)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-royal hover:text-navy"
            >
              {showMore ? "Hide" : "Add"} email, occupation &amp; income (optional)
              <ChevronDown className={cn("size-3.5 transition-transform", showMore && "rotate-180")} />
            </button>
            {showMore && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-navy">Email</Label>
                  <Input placeholder="you@example.com" className="mt-1 h-11" {...register("email")} />
                  {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-navy">Occupation</Label>
                  <Select onValueChange={(v) => setValue("occupation", v)}>
                    <SelectTrigger className="mt-1 h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salaried">Salaried</SelectItem>
                      <SelectItem value="self-employed-professional">Self-Employed Professional</SelectItem>
                      <SelectItem value="self-employed-business">Self-Employed (Business)</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-navy">Monthly Income (₹)</Label>
                  <Input inputMode="numeric" placeholder="e.g. 75000" className="mt-1 h-11" {...register("monthly_income")} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Button type="submit" variant="cta" size="xl" className="mt-5 w-full min-h-11" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        <span>{isSubmitting ? "Sending…" : ctaLabel}</span>
        {!isSubmitting && <ArrowRight className="size-4" aria-hidden="true" />}
      </Button>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-muted-foreground">
        {(benefits ?? ["Quick Response", "Expert Assistance", "No Obligation"]).map((b) => (
          <span key={b} className="inline-flex items-center gap-1">
            <CheckCircle2 className="size-3 text-emerald" /> {b}
          </span>
        ))}
      </div>
    </form>
  );
}
