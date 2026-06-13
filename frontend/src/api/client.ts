import axios, { AxiosHeaders, type AxiosInstance } from "axios";
import { getAccessToken, removeAccessToken } from "./token";

const LOGIN_PATH = "/login";
const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:8000";
const DEFAULT_CENTRAL_API_BASE_URL = "https://fadstock.org";

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getBaseUrl(value: string | undefined, fallback: string) {
  return stripTrailingSlash(value ?? fallback);
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== LOGIN_PATH) {
    window.location.assign(LOGIN_PATH);
  }
}

export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({ baseURL });

  client.interceptors.request.use((config) => {
    const accessToken = getAccessToken();

    if (accessToken) {
      config.headers = AxiosHeaders.from(config.headers);
      config.headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        removeAccessToken();
        redirectToLogin();
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export const apiClient = createApiClient(getBaseUrl(import.meta.env.VITE_API_BASE_URL, DEFAULT_API_BASE_URL));

export const localApiClient = createApiClient(
  getBaseUrl(import.meta.env.VITE_LOCAL_API_URL ?? import.meta.env.VITE_AI_API_URL, DEFAULT_LOCAL_API_BASE_URL),
);

export const centralApiClient = createApiClient(
  getBaseUrl(import.meta.env.VITE_CENTRAL_API_URL ?? import.meta.env.VITE_API_BASE_URL, DEFAULT_CENTRAL_API_BASE_URL),
);
