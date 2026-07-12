"use client";

/**
 * Hooks return placeholder provider data.
 * UI must treat results as ExecutiveBriefModel / narrative / insights only.
 */

import { useEffect, useState } from "react";
import type {
  ExecutiveBriefModel,
  ExecutiveInsight,
  ExecutiveNarrative,
} from "../contracts";
import {
  createExecutiveBriefProvider,
  createExecutiveInsightProvider,
  createExecutiveNarrativeProvider,
} from "../providers";

export function useExecutiveInsights(): {
  insights: readonly ExecutiveInsight[];
  loading: boolean;
  error: string | null;
} {
  const [insights, setInsights] = useState<readonly ExecutiveInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void createExecutiveInsightProvider()
      .listInsights()
      .then((rows) => {
        if (!cancelled) {
          setInsights(rows);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load executive insights");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { insights, loading, error };
}

export function useExecutiveNarrative(): {
  narrative: ExecutiveNarrative | null;
  loading: boolean;
  error: string | null;
} {
  const [narrative, setNarrative] = useState<ExecutiveNarrative | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void createExecutiveNarrativeProvider()
      .getNarrative()
      .then((row) => {
        if (!cancelled) {
          setNarrative(row);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load executive narrative");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { narrative, loading, error };
}

/**
 * Preferred UI hook — Executive Briefing should consume ExecutiveBriefModel only.
 */
export function useExecutiveBrief(): {
  brief: ExecutiveBriefModel | null;
  loading: boolean;
  error: string | null;
} {
  const [brief, setBrief] = useState<ExecutiveBriefModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void createExecutiveBriefProvider()
      .getBrief()
      .then((row) => {
        if (!cancelled) {
          setBrief(row);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load executive brief");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { brief, loading, error };
}
