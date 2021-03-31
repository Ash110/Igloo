import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";

const initSentry = () => {
    Sentry.init({
        dsn: "https://e50cb684d5ab4f9198c9f1e9ba813be0@o558722.ingest.sentry.io/5693270",
        tracesSampleRate: 1.0,
    });
}

module.exports = initSentry;