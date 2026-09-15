type UmamiTrack = (
  event: string,
  data?: Record<string, string | number | boolean>,
) => void;

declare global {
  interface Window {
    umami?: { track: UmamiTrack };
  }
}

export function trackUmami(
  event: string,
  data?: Record<string, string | number | boolean>,
) {
  if (!import.meta.client) return;
  const track = window.umami?.track;
  if (!track) return;
  if (data) track(event, data);
  else track(event);
}
