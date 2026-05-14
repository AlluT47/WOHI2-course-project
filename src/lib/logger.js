const pino = require("pino");

module.exports = pino({
    level: process.env.LOG_LEVEL || "info",
    redact: {
        paths: ["req.header.authorization", "req.body.password", "*.password"],
        censor: "[REDACTED]",
    },
    transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
});