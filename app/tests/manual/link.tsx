import type { ComponentProps } from "react";
// Links point to the real local app; this is not a substitute router.
export default function Link({ href, ...props }: ComponentProps<"a">) {
  return <a {...props} href={`http://localhost:3000${href}`} />;
}
