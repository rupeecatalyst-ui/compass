"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DiscoveryStepId } from "@/config/home-loan-discovery";
import { discoveryCopy } from "@/config/home-loan-discovery";
import {
  getDiscoveryStepOrder,
  readProductCodeFromPathname,
} from "@/config/compass-lending-products";
import { persistDiscoveryAnswers, restoreDiscoveryAnswers } from "@/lib/discovery-session";
import type { CompassJourneyConfig } from "@/lib/journey-config";
import { isMonthlyIncomeStepRequired } from "@/lib/journey-config";
import { clearDiscoveryLaunchUrl } from "@/discovery-template/launch-discovery";
import {
  fetchCompassJourneyConfig,
  fetchCompassLod,
  fetchDiscoveryIntelligence,
  startCompassJourney,
  submitCompassApplication,
  uploadCompassDocuments,
} from "@/services/catalyst-one/client";
import { signalCompassCustomerEngaged } from "@/components/pwa/pwa-install-prompt";
import type {
  CompassLodDto,
  CompassProductCode,
  CompassSubmitResponse,
  DiscoveryIntelligenceResult,
} from "@/services/catalyst-one/types";

export type DiscoveryAnswers = {
  propertyType?: "ready" | "construction";
  propertyUsage?: string;
  loanAmount: number;
  propertyValue: number;
  displayName: string;
  mobile: string;
  personalEmail: string;
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
};

const defaultAnswers: DiscoveryAnswers = {
  loanAmount: discoveryCopy.loanAmount.default,
  propertyValue: discoveryCopy.propertyValue.default,
  displayName: "",
  mobile: "",
  personalEmail: "",
  otpVerified: false,
  monthlyIncome: discoveryCopy.monthlyIncome.default,
  existingEmi: discoveryCopy.existingEmi.default,
  city: "",
  annualTurnover: discoveryCopy.annualTurnover.default,
  projectCost: discoveryCopy.projectCost.default,
};

function readProductCodeFromLocation(): CompassProductCode {
  if (typeof window === "undefined") return "home-loan";
  return readProductCodeFromPathname(window.location.pathname, window.location.search);
}

type DiscoveryContextValue = {
  isOpen: boolean;
  launchKey: number;
  productCode: CompassProductCode;
  step: DiscoveryStepId;
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
  launchDiscovery: (productCode?: CompassProductCode) => void;
  openDiscovery: () => void;
  closeDiscovery: () => void;
  setAnswer: <K extends keyof DiscoveryAnswers>(key: K, value: DiscoveryAnswers[K]) => void;
  goNext: (arg?: Partial<DiscoveryAnswers> | { nativeEvent?: unknown }) => void;
  goBack: () => void;
  nudgeCompass: () => void;
  completeJourney: () => void;
  startJourneySession: () => Promise<void>;
  loadIntelligence: () => Promise<void>;
  loadLod: () => Promise<void>;
  uploadDocumentFiles: (files: File[], options?: { typeRef?: string }) => Promise<void>;
  submitApplication: (input: {
    consentAccepted: boolean;
    declarationsAccepted: boolean;
    lenderShareAccepted: boolean;
  }) => Promise<void>;
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
  const [productCode, setProductCode] = useState<CompassProductCode>("home-loan");
  const [step, setStep] = useState<DiscoveryStepId>("welcome");
  const [answers, setAnswers] = useState<DiscoveryAnswers>(defaultAnswers);
  const [journeyConfig, setJourneyConfig] = useState<CompassJourneyConfig | null>(null);
  const [compassNudge, setCompassNudge] = useState(0);
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [sarathiActivated, setSarathiActivated] = useState(false);
  const [journeySessionToken, setJourneySessionToken] = useState<string | null>(null);
  const [opportunityRef, setOpportunityRef] = useState<string | null>(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [intelligence, setIntelligence] = useState<DiscoveryIntelligenceResult | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);
  const intelligenceRequestId = useRef(0);
  const [lod, setLod] = useState<CompassLodDto | null>(null);
  const [lodLoading, setLodLoading] = useState(false);
  const [lodError, setLodError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<CompassSubmitResponse | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const launchDiscovery = useCallback((nextProductCode?: CompassProductCode) => {
    if (typeof window !== "undefined") {
      clearDiscoveryLaunchUrl();
    }
    const resolved = nextProductCode || readProductCodeFromLocation();
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
      }
      return resolved;
    });
    setLaunchKey((k) => k + 1);
    setIsOpen(true);
    setStep("welcome");
    setCompassNudge((n) => n + 1);
    document.body.style.overflow = "hidden";
    void fetchCompassJourneyConfig(resolved)
      .then((config) => setJourneyConfig(config))
      .catch(() => setJourneyConfig(null));
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
      return next;
    });
    if (key === "loanAmount") {
      intelligenceRequestId.current += 1;
      setIntelligence(null);
    }
  }, [productCode]);

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
      const order = getDiscoveryStepOrder(productCode);
      const idx = order.indexOf(current);
      for (let i = idx + 1; i < order.length; i += 1) {
        const candidate = order[i];
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
  }, [nudgeCompass, productCode, journeyConfig, answers]);

  const goBack = useCallback(() => {
    setStep((current) => {
      const order = getDiscoveryStepOrder(productCode);
      const idx = order.indexOf(current);
      for (let i = idx - 1; i >= 0; i -= 1) {
        const candidate = order[i];
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
  }, [productCode, journeyConfig, answers]);

  const completeJourney = useCallback(() => {
    setJourneyComplete(true);
  }, []);

  const startJourneySession = useCallback(async () => {
    const started = await startCompassJourney({
      productCode,
      displayName: answers.displayName,
      mobile: answers.mobile,
      personalEmail: answers.personalEmail,
      city: answers.city || undefined,
      consentAccepted: true,
    });
    setJourneySessionToken(started.journeySessionToken);
    setOpportunityRef(started.opportunityRef);
    setOtpRequired(started.otpRequired);
    signalCompassCustomerEngaged();
    if (!started.otpRequired) {
      setAnswer("otpVerified", true);
    }
  }, [answers.city, answers.displayName, answers.mobile, answers.personalEmail, productCode, setAnswer]);

  const loadIntelligence = useCallback(async () => {
    if (!journeySessionToken) {
      setIntelligenceError("Your session could not be verified. Please restart the journey.");
      return;
    }
    const requestId = intelligenceRequestId.current + 1;
    intelligenceRequestId.current = requestId;
    setIntelligenceLoading(true);
    setIntelligenceError(null);
    try {
      const result = await fetchDiscoveryIntelligence({
        product: productCode,
        answers,
        journeySessionToken,
      });
      if (requestId !== intelligenceRequestId.current) return;
      setIntelligence(result);
    } catch {
      if (requestId !== intelligenceRequestId.current) return;
      setIntelligenceError(
        "We could not complete analysis right now. Your details are saved — please try again shortly.",
      );
    } finally {
      if (requestId === intelligenceRequestId.current) {
        setIntelligenceLoading(false);
      }
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
      goNext,
      goBack,
      nudgeCompass,
      completeJourney,
      startJourneySession,
      loadIntelligence,
      loadLod,
      uploadDocumentFiles,
      submitApplication,
      activateSarathi,
    }),
    [
      isOpen,
      launchKey,
      productCode,
      step,
      answers,
      journeyConfig,
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
      goNext,
      goBack,
      nudgeCompass,
      completeJourney,
      startJourneySession,
      loadIntelligence,
      loadLod,
      uploadDocumentFiles,
      submitApplication,
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
