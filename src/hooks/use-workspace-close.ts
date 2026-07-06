"use client";

import { useCallback, useEffect, useState } from "react";

export interface UseWorkspaceCloseOptions {
  onClose: () => void;
  hasUnsavedChanges?: boolean;
  onSaveAndClose?: () => void | boolean | Promise<void | boolean>;
  /** Window-level Escape listener — disable when a parent Dialog handles Escape. */
  enableEscapeKey?: boolean;
}

export interface WorkspaceCloseApi {
  requestClose: () => void;
  confirmOpen: boolean;
  setConfirmOpen: (open: boolean) => void;
  handleDiscard: () => void;
  handleSaveAndClose: () => Promise<void>;
  saving: boolean;
}

/** UX-01B — Unified close flow with unsaved-changes guard and optional Escape support. */
export function useWorkspaceClose({
  onClose,
  hasUnsavedChanges = false,
  onSaveAndClose,
  enableEscapeKey = true,
}: UseWorkspaceCloseOptions): WorkspaceCloseApi {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const requestClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setConfirmOpen(true);
      return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleDiscard = useCallback(() => {
    setConfirmOpen(false);
    onClose();
  }, [onClose]);

  const handleSaveAndClose = useCallback(async () => {
    if (!onSaveAndClose) {
      handleDiscard();
      return;
    }
    setSaving(true);
    try {
      const result = await onSaveAndClose();
      if (result === false) return;
      setConfirmOpen(false);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [handleDiscard, onClose, onSaveAndClose]);

  useEffect(() => {
    if (!enableEscapeKey) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirmOpen) return;
      e.preventDefault();
      requestClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen, enableEscapeKey, requestClose]);

  return {
    requestClose,
    confirmOpen,
    setConfirmOpen,
    handleDiscard,
    handleSaveAndClose,
    saving,
  };
}
