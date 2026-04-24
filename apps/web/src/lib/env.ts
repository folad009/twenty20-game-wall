export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Socket.IO connects to same origin as API by default */
export const socketUrl =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? apiBaseUrl;
