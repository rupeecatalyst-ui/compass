import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
        <Compass className="h-8 w-8 text-primary-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link href={ROUTES.DASHBOARD}>Back to Dashboard</Link>
      </Button>
    </div>
  );
}
