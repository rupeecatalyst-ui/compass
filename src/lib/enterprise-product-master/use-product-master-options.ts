"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchProductMasterOptions,
  getFallbackProductMasterOptions,
  invalidateProductMasterOptionsCache,
  type ProductMasterOption,
} from "./options";

export function useProductMasterOptions(enabledOnly = true) {
  const [options, setOptions] = useState<ProductMasterOption[]>(() =>
    getFallbackProductMasterOptions(),
  );
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"registry" | "canonical">("canonical");

  const refresh = useCallback(async () => {
    setLoading(true);
    invalidateProductMasterOptionsCache();
    const next = await fetchProductMasterOptions({ enabledOnly, force: true });
    setOptions(next);
    setSource(
      next.length && next[0]?.id ? "registry" : "canonical",
    );
    setLoading(false);
  }, [enabledOnly]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await fetchProductMasterOptions({ enabledOnly });
      if (cancelled) return;
      setOptions(next);
      setSource(next.some((o) => o.id) ? "registry" : "canonical");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabledOnly]);

  return { options, loading, source, refresh };
}
