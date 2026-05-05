import type { ApiError } from "../types";

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiException extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: string[],
  ) {
    super(message);
    this.name = "ApiException";
  }
}

export type DownloadResult = {
  blob: Blob;
  filename?: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  let error: ApiError;
  try {
    error = (await response.json()) as ApiError;
  } catch {
    throw new ApiException(response.status, response.statusText);
  }

  const message = Array.isArray(error.message)
    ? error.message[0]
    : error.message;

  throw new ApiException(
    error.statusCode ?? response.status,
    message,
    Array.isArray(error.message) ? error.message : undefined,
  );
}

function parseDownloadFilename(contentDisposition: string | null): string | undefined {
  if (!contentDisposition) return undefined;

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i);
  return plainMatch?.[1] ?? plainMatch?.[2]?.trim();
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | undefined>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value);
    });
  }
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  return handleResponse<T>(response);
}

export async function apiDownload(
  path: string,
  method: "GET" | "POST" = "POST",
): Promise<DownloadResult> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getToken() ?? ""}`,
    },
  });
  if (!response.ok) return handleResponse<never>(response);
  return {
    blob: await response.blob(),
    filename: parseDownloadFilename(response.headers.get("Content-Disposition")),
  };
}
