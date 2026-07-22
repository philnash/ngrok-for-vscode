export const sanitizeDiagnostic = (
  message: string,
  sensitiveValues: Array<string | undefined> = [process.env.NGROK_AUTHTOKEN],
) => {
  return sensitiveValues.reduce<string>(
    (sanitized, value) =>
      value ? sanitized.split(value).join("[REDACTED]") : sanitized,
    message,
  );
};
