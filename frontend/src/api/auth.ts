import { centralApiClient } from "./client";
import { getAccessToken, removeAccessToken, setAccessToken } from "./token";

export type LoginCredentials = {
  identifier: string;
  password: string;
};

export type SignupRequest = {
  identifier: string;
  password: string;
  name?: string;
};

export type AuthResponse = {
  accessToken?: string;
  token?: string;
  jwt?: string;
  data?: {
    accessToken?: string;
    token?: string;
    jwt?: string;
    user?: CurrentUser;
  };
  user?: CurrentUser;
};

export type CurrentUser = {
  id?: string;
  storeId?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
};

export type AuthResult = {
  accessToken: string;
  user?: CurrentUser;
};

function loginPayload(identifier: string, password: string) {
  const trimmedIdentifier = identifier.trim();
  return {
    email: trimmedIdentifier,
    storeId: trimmedIdentifier,
    username: trimmedIdentifier,
    password,
  };
}

function signupPayload(identifier: string, password: string, name?: string) {
  const payload = loginPayload(identifier, password);

  if (!name?.trim()) {
    return payload;
  }

  return {
    ...payload,
    name: name.trim(),
  };
}

function extractAccessToken(data: AuthResponse) {
  return data.accessToken ?? data.token ?? data.jwt ?? data.data?.accessToken ?? data.data?.token ?? data.data?.jwt ?? null;
}

function extractUser(data: AuthResponse) {
  return data.user ?? data.data?.user;
}

function storeAuthToken(data: AuthResponse): AuthResult | null {
  const accessToken = extractAccessToken(data);

  if (!accessToken) {
    return null;
  }

  setAccessToken(accessToken);
  return {
    accessToken,
    user: extractUser(data),
  };
}

export async function login(credentials: LoginCredentials) {
  const requestBody = loginPayload(credentials.identifier, credentials.password);
  const { data } = await centralApiClient.post<AuthResponse>("/api/auth/login", requestBody);
  const result = storeAuthToken(data);
  if (!result) throw new Error("인증 응답에 accessToken이 없습니다.");
  return result;
}

export async function signup(payload: SignupRequest) {
  const requestBody = signupPayload(payload.identifier, payload.password, payload.name);
  const { data } = await centralApiClient.post<AuthResponse>("/api/auth/signup", requestBody);
  const result = storeAuthToken(data);

  if (result) {
    return result;
  }

  return login({
    identifier: payload.identifier,
    password: payload.password,
  });
}

export async function fetchCurrentUser() {
  const { data } = await centralApiClient.get<CurrentUser>("/api/users/me");
  return data;
}

export function logout(redirectTo = "/login") {
  const hadAccessToken = Boolean(getAccessToken());

  if (hadAccessToken) {
    void centralApiClient.post("/api/v1/auth/logout").catch(() => {
      // Local logout must still succeed even if the central session has already expired.
    });
  }

  removeAccessToken();

  if (typeof window !== "undefined" && window.location.pathname !== redirectTo) {
    window.location.assign(redirectTo);
  }
}
