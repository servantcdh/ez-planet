export const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  const apiMessage = (
    error as { response?: { data?: { message?: string } } }
  )?.response?.data?.message;
  if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
    return apiMessage;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};
