import axios from "axios";

export function extractApiErrorMessage(payload: unknown, fallbackMessage: string) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return fallbackMessage;

  const detail = "detail" in payload ? (payload as { detail?: unknown }).detail : undefined;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  if ("message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return fallbackMessage;
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    return extractApiErrorMessage(error.response?.data, fallbackMessage);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}
