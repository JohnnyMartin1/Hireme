import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
  beforeSend(event) {
    if (event.request?.headers) {
      const h = { ...event.request.headers } as Record<string, string>;
      if (h.authorization) h.authorization = "[redacted]";
      if (h.Authorization) h.Authorization = "[redacted]";
      event.request.headers = h;
    }
    return event;
  },
});
