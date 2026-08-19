const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://166.0.242.53:1100";

  async function apiRequest(
  endpoint: string,
  options?: RequestInit
) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error: any = new Error(
      data?.message || data?.error || `Error ${res.status}`
    );

    error.status = res.status;
    error.data = data;

    throw error;
  }

  return data;
}


