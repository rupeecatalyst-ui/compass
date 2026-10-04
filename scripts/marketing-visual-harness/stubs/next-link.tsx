/**
 * Non-deployable visual harness — Next.js Link stub.
 */
import { forwardRef } from "react";

export const Link = forwardRef(function Link({ href, children, prefetch: _prefetch, replace: _replace, scroll: _scroll, ...props }, ref) {
  return (
    <a ref={ref} href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  );
});

export default Link;
