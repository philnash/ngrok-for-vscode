const defaultMaxLines = 20;
const defaultMaxLineLength = 500;

const sanitizeDiagnostic = (value, authToken = process.env.NGROK_AUTHTOKEN) => {
  const message = String(value);
  return authToken ? message.split(authToken).join("[REDACTED]") : message;
};

const createDiagnosticRecorder = ({
  authToken = process.env.NGROK_AUTHTOKEN,
  maxLines = defaultMaxLines,
  maxLineLength = defaultMaxLineLength,
} = {}) => {
  const lines = [];
  const sanitize = (value) => sanitizeDiagnostic(value, authToken);

  return {
    format: () => lines.join("\n") || "(no captured extension diagnostics)",
    record: (value) => {
      const message = sanitize(value);
      const line =
        message.length > maxLineLength
          ? `${message.slice(0, maxLineLength - 1)}…`
          : message;
      lines.push(line);
      if (lines.length > maxLines) {
        lines.shift();
      }
    },
    sanitize,
  };
};

module.exports = { createDiagnosticRecorder, sanitizeDiagnostic };
