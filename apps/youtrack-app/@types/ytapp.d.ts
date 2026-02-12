type YTAppHost = {
  fetchYouTrack?: (path: string, options?: RequestInit) => Promise<Response>;
  settings?: { get?: () => Promise<unknown> };
  getAppSettings?: () => Promise<unknown>;
  setTitle?: (title: string) => void;
  setLoadingAnimationEnabled?: (enabled: boolean) => void;
  setError?: (error: Error) => void;
  clearError?: () => void;
};

declare const YTApp: {
  register: (options?: {
    onAppLocationChange?: (location: unknown) => void;
  }) => Promise<YTAppHost>;
};
