import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip the staff tool, API routes, and Next.js internals/static assets.
  matcher: ["/((?!api|staff|_next|.*\\..*).*)"],
};
