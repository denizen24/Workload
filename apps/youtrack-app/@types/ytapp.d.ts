type YTAppHost = {
  fetchYouTrack?: (path: string, options?: RequestInit) => Promise<Response>;
  settings?: { get?: () => Promise<unknown> };
  getAppSettings?: () => Promise<unknown>;
};

declare const YTApp: {
  register: (options?: {
    onAppLocationChange?: (location: unknown) => void;
  }) => Promise<YTAppHost>;
};
