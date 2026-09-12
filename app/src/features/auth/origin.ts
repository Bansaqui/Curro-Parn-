import "server-only";
import { AppError } from "@/lib/utils/errors";
export function appOrigin() {
  try {
    const url = new URL(process.env.APP_ORIGIN ?? "http://localhost:3000");
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error();
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new AppError("CONFIG");
  }
}
