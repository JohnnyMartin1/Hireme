import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
  replaysOnErrorSampleRate: 0,
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers) {
      const h = { ...event.request.headers };
      if (h.authorization) h.authorization = "[redacted]";
      if (h.Authorization) h.Authorization = "[redacted]";
      event.request.headers = h;
    }
    return event;
  },
});
