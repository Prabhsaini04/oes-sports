"use client";

import type { User } from "firebase/auth";

export async function callApi(
  user: User,
  path: string,
  options: { method: string; body?: unknown }
): Promise<Response> {
  const idToken = await user.getIdToken();
  return fetch(path, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}
