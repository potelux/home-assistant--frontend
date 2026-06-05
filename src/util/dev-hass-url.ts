/** Use the page origin when auth URL differs only by localhost vs 127.0.0.1 (avoids CORS). */
export const devHassBaseUrl = (authUrl: string): string => {
  if (typeof window === "undefined") {
    return authUrl;
  }
  try {
    const authOrigin = new URL(authUrl).origin;
    const pageOrigin = window.location.origin;
    if (authOrigin === pageOrigin) {
      return authUrl;
    }
    const authHost = new URL(authUrl).hostname;
    const pageHost = window.location.hostname;
    if (
      (authHost === "127.0.0.1" && pageHost === "localhost") ||
      (authHost === "localhost" && pageHost === "127.0.0.1")
    ) {
      return pageOrigin;
    }
  } catch {
    // ignore invalid URLs
  }
  return authUrl;
};
