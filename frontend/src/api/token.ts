const ACCESS_TOKEN_KEY = "fedstock_access_token";

function getStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function getAccessToken() {
  return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function setAccessToken(token: string) {
  getStorage()?.setItem(ACCESS_TOKEN_KEY, token);
}

export function removeAccessToken() {
  getStorage()?.removeItem(ACCESS_TOKEN_KEY);
}
