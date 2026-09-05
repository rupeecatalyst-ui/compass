/**
 * Non-deployable visual harness — Next.js navigation stub.
 * No production routing. No authentication bypass.
 */

const params = new URLSearchParams();

export function useRouter() {
  return {
    push() {},
    replace() {},
    back() {},
    prefetch() {},
    refresh() {},
    forward() {},
  };
}

export function usePathname() {
  return "/admin/marketing";
}

export function useSearchParams() {
  return params;
}

export function useParams() {
  return { campaignId: "mkt-camp-visual-fixture" };
}

export function redirect() {}

export function notFound() {}
