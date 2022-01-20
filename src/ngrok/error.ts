export function isError(error: any): error is NodeJS.ErrnoException {
  return error instanceof Error;
}
