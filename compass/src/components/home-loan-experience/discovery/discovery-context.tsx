"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { discoveryCopy } from "@/config/home-loan-discovery";
import {
  getDiscoveryStepOrder,
  isCompassCatalogProduct,
  readProductCodeFromPathname,
} from "@/config/compass-lending-products";
import { persistDiscoveryAnswers, persistJourneyToken, restoreDiscoveryAnswers, restoreJourneyToken } from "@/lib/discovery-session";
import type { CompassJourneyConfig } from "@/lib/journey-config";
import { governedDiscoveryStepOrder, isMonthlyIncomeStepRequired, publicStageOrder } from "@/lib/journey-config";
import { clearDiscoveryLaunchUrl } from "@/discovery-template/launch-discovery";
import {
  fetchCompassJourneyConfig,
  fetchCompassLod,
  fetchCompassResume,
  fetchDiscoveryIntelligence,
  persistCompassAnswers,
  requestCompassTalkToExpert,
  startCompassJourney,
  submitCompassApplication,
  uploadCompassDocuments,
} from "@/services/catalyst-one/client";
import { signalCompassCustomerEngaged } from "@/components/pwa/pwa-install-prompt";
import type {
  CompassLodDto,
  CompassSubmitResponse,
  DiscoveryIntelligenceResult,
} from "@/services/catalyst-one/types";

export type DiscoveryAnswers = {
  propertyType?: "ready" | "construction";
  propertyUsage?: string;
  loanAmount: number;
  propertyValue: number;
  mobile: string;
  otpVerified: boolean;
  incomeType?: string;
  monthlyIncome: number;
  existingEmi: number;
  city: string;
  loanPurpose?: string;
  companyName?: string;
  constitution?: string;
  annualTurnover?: number;
  facilityType?: string;
  projectCost?: number;
  currentLender?: string;
  outstandingLoanAmount?: number;
  approxCibilScore?: string;
  displayName?: string;
  personalEmail?: string;
  fieldAnswers?: Record<string, string>;
};

function resolveStepOrder(
  productCode: string,
  config: CompassJourneyConfig | null,
  configUnavailable: boolean,
): string[] | null {
  if (configUnavailable || config?.journeyUnavailable) return null;
  if (!config) return null;
  const staged = publicStageOrder(productCode, config);
  if (staged) return staged;
  if (isCompassCatalogProduct(productCode)) {
    return governedDiscoveryStepOrder(config, getDiscoveryStepOrder(productCode));
  }
  return null;
}

const defaultAnswers: DiscoveryAnswers = {
  loanAmount: discoveryCopy.loanAmount.default,
  propertyValue: discoveryCopy.propertyValue.default,
  mobile: "",
  otpVerified: false,
  monthlyIncome: discoveryCopy.monthlyIncome.default,
  existingEmi: discoveryCopy.existingEmi.default,
  city: "",
  annualTurnover: discoveryCopy.annualTurnover.default,
  projectCost: discoveryCopy.projectCost.default,
};

function shouldSkipAnsweredStage(candidate: string, merged: DiscoveryAnswers, mobileVerified: boolean): boolean {
  if (mobileVerified && (candidate === "mobile" || candidate === "otp")) return true;
  if (candidate === "displayName" && (merged.displayName ?? "").trim().length >= 2) return true;
  if (
    candidate === "email" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((merged.personalEmail ?? "").trim())
  ) {
    return true;
  }
  return false;
}

function readProductCodeFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return readProductCodeFromPathname(window.location.pathname, window.location.search);
}

type DiscoveryContextValue = {
  isOpen: boolean;
  launchKey: number;
  productCode: string;
  step: string;
  configUnavailable: boolean;
  answers: DiscoveryAnswers;
  journeyConfig: CompassJourneyConfig | null;
  compassNudge: number;
  journeyComplete: boolean;
  sarathiActivated: boolean;
  journeySessionToken: string | null;
  opportunityRef: string | null;
  otpRequired: boolean;
  intelligence: DiscoveryIntelligenceResult | null;
  intelligenceLoading: boolean;
  intelligenceError: string | null;
  lod: CompassLodDto | null;
  lodLoading: boolean;
  lodError: string | null;
  uploadLoading: boolean;
  submitting: boolean;
  submissionResult: CompassSubmitResponse | null;
  submissionError: string | null;
  launchDiscovery: (productCode?: string) => void;
  openDiscovery: () => void;
  closeDiscovery: () => void;
  setAnswer: <K extends keyof DiscoveryAnswers>(key: K, value: DiscoveryAnswers[K]) => void;
  setFieldAnswer: (fieldId: string, value: string) => void;
  goNext: (arg?: Partial<DiscoveryAnswers> | { nativeEvent?: unknown }) => void;
  goBack: () => void;
  nudgeCompass: () => void;
  completeJourney: () => void;
  startJourneySession: (otpVerificationToken?: string) => Promise<void>;
  loadIntelligence: () => Promise<void>;
  loadLod: () => Promise<void>;
  uploadDocumentFiles: (files: File[], options?: { typeRef?: string }) => Promise<void>;
  submitApplication: (input: {
    consentAccepted: boolean;
    declarationsAccepted: boolean;
    lenderShareAccepted: boolean;
  }) => Promise<void>;
  requestTalkToExpert: () => Promise<DiscoveryIntelligenceResult["expertSla"]>;
  activateSarathi: () => void;
};

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null);

function mergeStoredAnswers(stored: Record<string, unknown> | null): DiscoveryAnswers {
  if (!stored) return { ...defaultAnswers };
  const loanAmount =
    typeof stored.loanAmount === "number" && stored.loanAmount > 0
      ? Math.round(stored.loanAmount)
      : defaultAnswers.loanAmount;
  return {
    ...defaultAnswers,
    ...stored,
    loanAmount,
  } as DiscoveryAnswers;
}

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [launchKey, setLaunchKey] = useState(0);
  const [productCode, setProductCode] = useState("");
  const [configUnavailable, setConfigUnavailable] = useState(false);
  const [step, setStep] = useState("welcome");
  const [answers, setAnswers] = useState<DiscoveryAnswers>(defaultAnswers);
  const [journeyConfig, setJourneyConfig] = useState<CompassJourneyConfig | null>(null);
  const [compassNudge, setCompassNudge] = useState(0);
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [sarathiActivated, setSarathiActivated] = useState(false);
  const [journeySessionToken, setJourneySessionToken] = useState<string | null>(null);
  const [opportunityRef, setOpportunityRef] = useState<string | null>(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [intelligence, setIntelligence] = useState<DiscoveryIntelligenceResult | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);
  const [lod, setLod] = useState<CompassLodDto | null>(null);
  const [lodLoading, setLodLoading] = useState(false);
  const [lodError, setLodError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<CompassSubmitResponse | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const launchDiscovery = useCallback((nextProductCode?: string) => {
    if (typeof window !== "undefined") {
      clearDiscoveryLaunchUrl();
    }
    const resolved = nextProductCode || readProductCodeFromLocation();
    if (!resolved) {
      setProductCode("");
      setJourneyConfig(null);
      setConfigUnavailable(true);
      setIsOpen(true);
      setStep("welcome");
      return;
    }
    setProductCode((previous) => {
      if (previous !== resolved) {
        setJourneyComplete(false);
        setJourneySessionToken(null);
        setOpportunityRef(null);
        setIntelligence(null);
        setLod(null);
        setSubmissionResult(null);
        const stored =
          typeof window !== "undefined"
            ? restoreDiscoveryAnswers(window.sessionStorage, resolved)
            : null;
        setAnswers(mergeStoredAnswers(stored));
        setJourneyConfig(null);
        setConfigUnavailable(false);
      }
      return resolved;
    });
    setLaunchKey((k) => k + 1);
    setIsOpen(true);
    setStep("welcome");
    setCompassNudge((n) => n + 1);
    document.body.style.overflow = "hidden";
    const resumedToken =
      typeof window !== "undefined" ? restoreJourneyToken(window.sessionStorage, resolved) : null;
    if (resumedToken) {
      setJourneySessionToken(resumedToken);
      void fetchCompassResume(resumedToken)
        .then((resume) => {
          setOpportunityRef(resume.opportunityRef);
          setMobileVerified(Boolean(resume.mobileVerified));
          if (resume.journeyVersion) {
            void fetchCompassJourneyConfig(resolved, resume.journeyVersion)
              .then((config) => {
                setJourneyConfig(config);
                setConfigUnavailable(false);
              })
              .catch(() => setConfigUnavailable(true));
          }
          setAnswers((prev) => ({
            ...prev,
            displayName: resume.displayName ?? prev.displayName,
            personalEmail: resume.personalEmail ?? prev.personalEmail,
            fieldAnswers: {
              ...prev.fieldAnswers,
              ...Object.fromEntries(
                Object.entries(resume.answers ?? {})
                  .filter(([, value]) => value != null && String(value).trim())
                  .map(([key, value]) => [key, String(value)]),
              ),
            },
          }));
        })
        .catch(() => undefined);
    }
    void fetchCompassJourneyConfig(resolved)
      .then((config) => {
        setJourneyConfig(config);
        setConfigUnavailable(false);
      })
      .catch(() => {
        setJourneyConfig(null);
        setConfigUnavailable(true);
      });
  }, []);

  const openDiscovery = launchDiscovery;

  const closeDiscovery = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = restoreDiscoveryAnswers(window.sessionStorage, productCode);
    if (!stored) return;
    setAnswers((prev) => {
      const merged = mergeStoredAnswers({ ...prev, ...stored });
      return merged.loanAmount === prev.loanAmount &&
        merged.mobile === prev.mobile &&
        merged.city === prev.city
        ? prev
        : merged;
    });
  }, [productCode]);

  useEffect(() => {
    const max = journeyConfig?.requestedAmountMax;
    if (typeof max !== "number" || max <= 0) return;
    setAnswers((prev) => (prev.loanAmount > max ? { ...prev, loanAmount: max } : prev));
  }, [journeyConfig]);

  const setAnswer = useCallback(<K extends keyof DiscoveryAnswers>(key: K, value: DiscoveryAnswers[K]) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      if (typeof window !== "undefined") {
        persistDiscoveryAnswers(window.sessionStorage, productCode, next);
      }
      if (journeySessionToken) {
        void persistCompassAnswers(journeySessionToken, productCode, next);
      }
      return next;
    });
  }, [productCode, journeySessionToken]);

  const setFieldAnswer = useCallback((fieldId: string, value: string) => {
    setAnswers((prev) => {
      const next = {
        ...prev,
        fieldAnswers: { ...prev.fieldAnswers, [fieldId]: value },
      };
      if (typeof window !== "undefined") {
        persistDiscoveryAnswers(window.sessionStorage, productCode, next);
      }
      if (journeySessionToken) {
        void persistCompassAnswers(journeySessionToken, productCode, next);
      }
      return next;
    });
  }, [productCode, journeySessionToken]);

  const nudgeCompass = useCallback(() => {
    setCompassNudge((n) => n + 1);
  }, []);

  const goNext = useCallback((arg?: Partial<DiscoveryAnswers> | { nativeEvent?: unknown }) => {
    const merged =
      arg &&
      typeof arg === "object" &&
      !("nativeEvent" in arg)
        ? { ...answers, ...(arg as Partial<DiscoveryAnswers>) }
        : answers;
    setStep((current) => {
      const order = resolveStepOrder(productCode, journeyConfig, configUnavailable);
      if (!order) return current;
      const idx = order.indexOf(current);
      for (let i = idx + 1; i < order.length; i += 1) {
        const candidate = order[i];
        if (shouldSkipAnsweredStage(candidate, merged, mobileVerified)) continue;
        if (
          candidate === "monthlyIncome" &&
          !isMonthlyIncomeStepRequired(journeyConfig, {
            ...merged,
            employmentTypeCode: merged.incomeType,
          })
        ) {
          continue;
        }
        return candidate ?? current;
      }
      return current;
    });
    nudgeCompass();
  }, [configUnavailable, nudgeCompass, productCode, journeyConfig, answers, mobileVerified]);

  const goBack = useCallback(() => {
    setStep((current) => {
      const order = resolveStepOrder(productCode, journeyConfig, configUnavailable);
      if (!order) return current;
      const idx = order.indexOf(current);
      for (let i = idx - 1; i >= 0; i -= 1) {
        const candidate = order[i];
        if (shouldSkipAnsweredStage(candidate, answers, mobileVerified)) continue;
        if (
          candidate === "monthlyIncome" &&
          !isMonthlyIncomeStepRequired(journeyConfig, {
            ...answers,
            incomeType: answers.incomeType,
            employmentTypeCode: answers.incomeType,
            annualTurnover: answers.annualTurnover,
          })
        ) {
          continue;
        }
        return candidate ?? current;
      }
      return current;
    });
  }, [configUnavailable, productCode, journeyConfig, answers, mobileVerified]);

  const completeJourney = useCallback(() => {
    setJourneyComplete(true);
  }, []);

  const startJourneySession = useCallback(async (otpVerificationToken?: string) => {
    const started = await startCompassJourney({
      productCode,
      mobile: answers.mobile,
      city: answers.city || undefined,
      otpVerificationToken,
    });
    setJourneySessionToken(started.journeySessionToken);
    setOpportunityRef(started.opportunityRef);
    setOtpRequired(started.otpRequired);
    setMobileVerified(started.mobileVerified === true);
    if (typeof window !== "undefined") {
      persistJourneyToken(window.sessionStorage, productCode, started.journeySessionToken);
    }
    signalCompassCustomerEngaged();
    if (started.mobileVerified === true) {
      setAnswer("otpVerified", true);
    }
    if (started.campaignEmail?.value && started.campaignEmail.independentlyVerified === false) {
      setAnswer("personalEmail", started.campaignEmail.value);
    }
  }, [answers.city, answers.mobile, productCode, setAnswer]);

  const loadIntelligence = useCallback(async () => {
    if (!journeySessionToken) {
      setIntelligenceError("Your session could not be verified. Please restart the journey.");
      return;
    }
    setIntelligenceLoading(true);
    setIntelligenceError(null);
    try {
      const result = await fetchDiscoveryIntelligence({
        product: productCode,
        answers,
        journeySessionToken,
      });
      setIntelligence(result);
    } catch {
      setIntelligenceError(
        "We could not complete analysis right now. Your details are saved — please try again shortly.",
      );
    } finally {
      setIntelligenceLoading(false);
    }
  }, [answers, journeySessionToken, productCode]);

  const loadLod = useCallback(async () => {
    if (!journeySessionToken) {
      setLodError("Your session could not be verified. Please restart the journey.");
      return;
    }
    setLodLoading(true);
    setLodError(null);
    try {
      const result = await fetchCompassLod(journeySessionToken);
      setLod(result);
    } catch {
      setLodError("We could not load your document checklist right now. Please try again shortly.");
    } finally {
      setLodLoading(false);
    }
  }, [journeySessionToken]);

  const uploadDocumentFiles = useCallback(
    async (files: File[], options?: { typeRef?: string }) => {
      if (!journeySessionToken || files.length === 0) return;
      setUploadLoading(true);
      setLodError(null);
      try {
        const result = await uploadCompassDocuments(journeySessionToken, files, options);
        setLod(result.lod);
      } catch (err) {
        setLodError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setUploadLoading(false);
      }
    },
    [journeySessionToken],
  );

  const submitApplication = useCallback(
    async (input: {
      consentAccepted: boolean;
      declarationsAccepted: boolean;
      lenderShareAccepted: boolean;
    }) => {
      if (!journeySessionToken) {
        setSubmissionError("Your session could not be verified. Please restart the journey.");
        return;
      }
      if (!input.consentAccepted || !input.declarationsAccepted || !input.lenderShareAccepted) {
        setSubmissionError("Please accept all declarations before submitting.");
        return;
      }
      setSubmitting(true);
      setSubmissionError(null);
      try {
        const result = await submitCompassApplication(journeySessionToken, {
          consentAccepted: input.consentAccepted,
          lenderShareAccepted: input.lenderShareAccepted,
          declarationsAccepted: input.declarationsAccepted,
        });
        setSubmissionResult(result);
        setJourneyComplete(true);
        setStep("confirmation");
      } catch (err) {
        setSubmissionError(err instanceof Error ? err.message : "Submission failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [journeySessionToken],
  );

  const requestTalkToExpert = useCallback(async () => {
    if (!journeySessionToken) {
      setIntelligenceError("Your session could not be verified. Please restart the journey.");
      return null;
    }
    try {
      const sla = await requestCompassTalkToExpert(journeySessionToken);
      setIntelligence((prev) => (prev ? { ...prev, expertSla: sla } : prev));
      return sla;
    } catch (err) {
      setIntelligenceError(err instanceof Error ? err.message : "Unable to request a specialist right now.");
      return null;
    }
  }, [journeySessionToken]);

  const activateSarathi = useCallback(() => {
    setJourneyComplete(true);
    setSarathiActivated(true);
    setIsOpen(false);
    document.body.style.overflow = "";
    window.setTimeout(() => {
      document.getElementById("advantage-conversation")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 450);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      launchKey,
      productCode,
      step,
      answers,
      journeyConfig,
      configUnavailable,
      compassNudge,
      journeyComplete,
      sarathiActivated,
      journeySessionToken,
      opportunityRef,
      otpRequired,
      intelligence,
      intelligenceLoading,
      intelligenceError,
      lod,
      lodLoading,
      lodError,
      uploadLoading,
      submitting,
      submissionResult,
      submissionError,
      launchDiscovery,
      openDiscovery,
      closeDiscovery,
      setAnswer,
      setFieldAnswer,
      goNext,
      goBack,
      nudgeCompass,
      completeJourney,
      startJourneySession,
      loadIntelligence,
      loadLod,
      uploadDocumentFiles,
      submitApplication,
      requestTalkToExpert,
      activateSarathi,
    }),
    [
      isOpen,
      launchKey,
      productCode,
      step,
      answers,
      journeyConfig,
      configUnavailable,
      compassNudge,
      journeyComplete,
      sarathiActivated,
      journeySessionToken,
      opportunityRef,
      otpRequired,
      intelligence,
      intelligenceLoading,
      intelligenceError,
      lod,
      lodLoading,
      lodError,
      uploadLoading,
      submitting,
      submissionResult,
      submissionError,
      launchDiscovery,
      openDiscovery,
      closeDiscovery,
      setAnswer,
      setFieldAnswer,
      goNext,
      goBack,
      nudgeCompass,
      completeJourney,
      startJourneySession,
      loadIntelligence,
      loadLod,
      uploadDocumentFiles,
      submitApplication,
      requestTalkToExpert,
      activateSarathi,
    ],
  );

  return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>;
}

export function useDiscovery() {
  const ctx = useContext(DiscoveryContext);
  if (!ctx) throw new Error("useDiscovery must be used within DiscoveryProvider");
  return ctx;
}

export function useDiscoveryOptional() {
  return useContext(DiscoveryContext);
}
