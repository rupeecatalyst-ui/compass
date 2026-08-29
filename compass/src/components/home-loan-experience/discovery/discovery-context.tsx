"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { DiscoveryStepId } from "@/config/home-loan-discovery";
import { DISCOVERY_STEP_ORDER, discoveryCopy } from "@/config/home-loan-discovery";
import { clearDiscoveryLaunchUrl } from "@/discovery-template/launch-discovery";
import {
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
  loanAmount: number;
  propertyValue: number;
  mobile: string;
  otpVerified: boolean;
  incomeType?: "salaried" | "business" | "professional";
  monthlyIncome: number;
  existingEmi: number;
  city: string;
};

const defaultAnswers: DiscoveryAnswers = {
  loanAmount: discoveryCopy.loanAmount.default,
  propertyValue: discoveryCopy.propertyValue.default,
  mobile: "",
  otpVerified: false,
  monthlyIncome: discoveryCopy.monthlyIncome.default,
  existingEmi: discoveryCopy.existingEmi.default,
  city: "",
};

function readProductCodeFromLocation(): CompassProductCode {
  if (typeof window === "undefined") return "home-loan";
  const params = new URLSearchParams(window.location.search);
  const product = params.get("product");
  return product === "home-loan-balance-transfer" ? "home-loan-balance-transfer" : "home-loan";
}

type DiscoveryContextValue = {
  isOpen: boolean;
  launchKey: number;
  productCode: CompassProductCode;
  step: DiscoveryStepId;
  answers: DiscoveryAnswers;
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
  goNext: () => void;
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

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [launchKey, setLaunchKey] = useState(0);
  const [productCode, setProductCode] = useState<CompassProductCode>("home-loan");
  const [step, setStep] = useState<DiscoveryStepId>("welcome");
  const [answers, setAnswers] = useState<DiscoveryAnswers>(defaultAnswers);
  const [compassNudge, setCompassNudge] = useState(0);
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [sarathiActivated, setSarathiActivated] = useState(false);
  const [journeySessionToken, setJourneySessionToken] = useState<string | null>(null);
  const [opportunityRef, setOpportunityRef] = useState<string | null>(null);
  const [otpRequired, setOtpRequired] = useState(false);
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

  const launchDiscovery = useCallback((nextProductCode?: CompassProductCode) => {
    if (typeof window !== "undefined") {
      clearDiscoveryLaunchUrl();
    }
    setProductCode(nextProductCode || readProductCodeFromLocation());
    setLaunchKey((k) => k + 1);
    setIsOpen(true);
    if (!journeyComplete) setStep("welcome");
    else setStep("advantage");
    setCompassNudge((n) => n + 1);
    document.body.style.overflow = "hidden";
  }, [journeyComplete]);

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

  const setAnswer = useCallback(<K extends keyof DiscoveryAnswers>(key: K, value: DiscoveryAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const nudgeCompass = useCallback(() => {
    setCompassNudge((n) => n + 1);
  }, []);

  const goNext = useCallback(() => {
    setStep((current) => {
      const idx = DISCOVERY_STEP_ORDER.indexOf(current);
      const next = DISCOVERY_STEP_ORDER[Math.min(idx + 1, DISCOVERY_STEP_ORDER.length - 1)];
      return next ?? current;
    });
    nudgeCompass();
  }, [nudgeCompass]);

  const goBack = useCallback(() => {
    setStep((current) => {
      const idx = DISCOVERY_STEP_ORDER.indexOf(current);
      if (idx <= 0) return current;
      return DISCOVERY_STEP_ORDER[idx - 1] ?? current;
    });
  }, []);

  const completeJourney = useCallback(() => {
    setJourneyComplete(true);
  }, []);

  const startJourneySession = useCallback(async () => {
    const started = await startCompassJourney({
      productCode,
      mobile: answers.mobile,
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
