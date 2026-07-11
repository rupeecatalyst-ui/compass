"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { DiscoveryStepId } from "@/config/home-loan-discovery";
import { DISCOVERY_STEP_ORDER, discoveryCopy } from "@/config/home-loan-discovery";
import { clearDiscoveryLaunchUrl } from "@/discovery-template/launch-discovery";
import { fetchDiscoveryIntelligence } from "@/services/catalyst-one/client";
import type { DiscoveryIntelligenceResult } from "@/services/catalyst-one/types";

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

type DiscoveryContextValue = {
  isOpen: boolean;
  launchKey: number;
  step: DiscoveryStepId;
  answers: DiscoveryAnswers;
  compassNudge: number;
  journeyComplete: boolean;
  sarathiActivated: boolean;
  intelligence: DiscoveryIntelligenceResult | null;
  intelligenceLoading: boolean;
  intelligenceError: string | null;
  launchDiscovery: () => void;
  openDiscovery: () => void;
  closeDiscovery: () => void;
  setAnswer: <K extends keyof DiscoveryAnswers>(key: K, value: DiscoveryAnswers[K]) => void;
  goNext: () => void;
  goBack: () => void;
  nudgeCompass: () => void;
  completeJourney: () => void;
  loadIntelligence: () => Promise<void>;
  activateSarathi: () => void;
};

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null);

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [launchKey, setLaunchKey] = useState(0);
  const [step, setStep] = useState<DiscoveryStepId>("welcome");
  const [answers, setAnswers] = useState<DiscoveryAnswers>(defaultAnswers);
  const [compassNudge, setCompassNudge] = useState(0);
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [sarathiActivated, setSarathiActivated] = useState(false);
  const [intelligence, setIntelligence] = useState<DiscoveryIntelligenceResult | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);

  const launchDiscovery = useCallback(() => {
    if (typeof window !== "undefined") {
      clearDiscoveryLaunchUrl();
    }
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

  const loadIntelligence = useCallback(async () => {
    setIntelligenceLoading(true);
    setIntelligenceError(null);
    try {
      const result = await fetchDiscoveryIntelligence(answers);
      setIntelligence(result);
    } catch {
      setIntelligenceError("We couldn't prepare your Advantage. Please try again.");
    } finally {
      setIntelligenceLoading(false);
    }
  }, [answers]);

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
      step,
      answers,
      compassNudge,
      journeyComplete,
      sarathiActivated,
      intelligence,
      intelligenceLoading,
      intelligenceError,
      launchDiscovery,
      openDiscovery,
      closeDiscovery,
      setAnswer,
      goNext,
      goBack,
      nudgeCompass,
      completeJourney,
      loadIntelligence,
      activateSarathi,
    }),
    [
      isOpen,
      launchKey,
      step,
      answers,
      compassNudge,
      journeyComplete,
      sarathiActivated,
      intelligence,
      intelligenceLoading,
      intelligenceError,
      launchDiscovery,
      openDiscovery,
      closeDiscovery,
      setAnswer,
      goNext,
      goBack,
      nudgeCompass,
      completeJourney,
      loadIntelligence,
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
