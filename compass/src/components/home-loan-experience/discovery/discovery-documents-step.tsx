"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FolderUp, Loader2, Upload } from "lucide-react";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { discoveryCopy } from "@/config/home-loan-discovery";
import { Button } from "@/components/ui/button";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  missing: "Pending",
  uploaded: "Uploaded",
  pending_verification: "Under review",
  verified: "Verified",
  rejected: "Rejected",
} as const;

export function DiscoveryDocumentsStep() {
  const {
    lod,
    lodLoading,
    lodError,
    uploadLoading,
    loadLod,
    uploadDocumentFiles,
    goNext,
  } = useDiscovery();
  const reduceMotion = useReducedMotion();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const c = discoveryCopy.documents;

  useEffect(() => {
    void loadLod();
  }, [loadLod]);

  const onFolderSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    void uploadDocumentFiles(files);
    event.target.value = "";
  };

  const onItemSelected = (typeRef: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadDocumentFiles([file], { typeRef });
    event.target.value = "";
  };

  return (
    <motion.div
      key="documents"
      initial={reduceMotion ? false : { opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -16, filter: "blur(6px)" }}
      transition={{ duration: 0.5, ease: smoothEase }}
      className="flex flex-1 flex-col"
    >
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{c.heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      {lodLoading ? (
        <div className="mt-12 flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          {c.loading}
        </div>
      ) : null}

      {lodError ? (
        <p className="mt-8 text-center text-sm text-destructive">{lodError}</p>
      ) : null}

      {lod ? (
        <div className="mx-auto mt-8 w-full max-w-lg space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {c.completionLabel}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{lod.completionPercent}%</p>
              </div>
              {lod.items.length === 0 ? (
                <p className="text-right text-sm text-muted-foreground">Checklist pending</p>
              ) : lod.mandatoryPending > 0 ? (
                <p className="text-right text-sm text-muted-foreground">
                  {lod.mandatoryPending} {c.mandatoryPending}
                </p>
              ) : (
                <p className="text-right text-sm text-primary">All mandatory documents received</p>
              )}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${lod.completionPercent}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.04] p-5">
            <p className="text-sm font-medium text-foreground">{c.folderCta}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.folderHelper}</p>
            <input
              ref={folderInputRef}
              type="file"
              className="hidden"
              multiple
              // @ts-expect-error webkitdirectory is supported in Chromium browsers
              webkitdirectory=""
              directory=""
              onChange={onFolderSelected}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-11 bg-transparent"
              disabled={uploadLoading}
              onClick={() => folderInputRef.current?.click()}
            >
              {uploadLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderUp className="h-4 w-4" />
              )}
              {c.folderCta}
            </Button>
          </div>

          <div className="space-y-3">
            {lod.items.length === 0 ? (
              <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-muted-foreground">
                A certified document checklist is not available for this product yet. You may
                continue — a Rupee Catalyst advisor will confirm required documents.
              </p>
            ) : null}
            {lod.items.map((item) => (
              <div
                key={item.itemId}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {item.participantLabel ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.participantLabel}</p>
                    ) : null}
                    {item.fileName ? (
                      <p className="mt-1 truncate text-xs text-primary">{item.fileName}</p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                      item.uploadStatus === "missing"
                        ? "border border-white/10 text-muted-foreground"
                        : "border border-primary/25 bg-primary/10 text-primary",
                    )}
                  >
                    {STATUS_LABELS[item.uploadStatus]}
                    {item.mandatory ? " · Required" : ""}
                  </span>
                </div>
                <label className="mt-3 inline-flex cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept={item.allowedMimeTypes.join(",") || undefined}
                    onChange={onItemSelected(item.typeRef)}
                  />
                  <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-xs font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/[0.06]">
                    <Upload className="h-3.5 w-3.5" />
                    {c.itemCta}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex justify-center">
        <Button size="lg" className="h-12 px-10" disabled={lodLoading || uploadLoading} onClick={goNext}>
          {c.continueCta}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
