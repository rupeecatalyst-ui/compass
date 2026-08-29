/**
 * Mobile-friendly file input attributes for document/camera capture.
 * Use on COMPASS customer upload controls — never caches selections in SW.
 */
export const MOBILE_DOCUMENT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp";

export function mobileFileInputProps(opts?: { capture?: boolean; multiple?: boolean }) {
  return {
    type: "file" as const,
    accept: MOBILE_DOCUMENT_ACCEPT,
    multiple: opts?.multiple ?? false,
    ...(opts?.capture ? { capture: "environment" as const } : {}),
  };
}
