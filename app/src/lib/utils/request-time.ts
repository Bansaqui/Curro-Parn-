import "server-only";
import { cache } from "react";
// All server components in one request use the same observed instant.
export const getRequestTime = cache(() => Date.now());
