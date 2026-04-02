import { useCallback, useReducer } from "react";

import { WorkloadResponse } from "../types";

const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Ошибка загрузки");
  }
  return (await response.json()) as WorkloadResponse;
};

type UploadState = {
  data: WorkloadResponse | null;
  isLoading: boolean;
  error: string | null;
  showSprintSetup: boolean;
};

type UploadAction =
  | { type: "UPLOAD_START" }
  | { type: "UPLOAD_SUCCESS"; data: WorkloadResponse; showSetup: boolean }
  | { type: "UPLOAD_ERROR"; error: string }
  | { type: "SET_DATA"; data: WorkloadResponse | null }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_SHOW_SPRINT_SETUP"; show: boolean };

const uploadInitialState: UploadState = {
  data: null,
  isLoading: false,
  error: null,
  showSprintSetup: false
};

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case "UPLOAD_START":
      return { ...state, isLoading: true, error: null };
    case "UPLOAD_SUCCESS":
      return { ...state, isLoading: false, data: action.data, showSprintSetup: action.showSetup };
    case "UPLOAD_ERROR":
      return { ...state, isLoading: false, error: action.error };
    case "SET_DATA":
      return { ...state, data: action.data };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_SHOW_SPRINT_SETUP":
      return { ...state, showSprintSetup: action.show };
    default:
      return state;
  }
}

export function useUpload(sprintsLength: number) {
  const [uploadState, dispatch] = useReducer(uploadReducer, uploadInitialState);
  const { data, isLoading, error, showSprintSetup } = uploadState;

  const setError = useCallback(
    (err: string | null) => dispatch({ type: "SET_ERROR", error: err }),
    []
  );

  const setData = useCallback(
    (d: WorkloadResponse | null) => dispatch({ type: "SET_DATA", data: d }),
    []
  );

  const setShowSprintSetup = useCallback(
    (show: boolean) => dispatch({ type: "SET_SHOW_SPRINT_SETUP", show }),
    []
  );

  const handleUpload = useCallback(
    async (file: File) => {
      dispatch({ type: "UPLOAD_START" });
      try {
        const result = await uploadFile(file);
        dispatch({ type: "UPLOAD_SUCCESS", data: result, showSetup: sprintsLength === 0 });
        return result;
      } catch (err) {
        dispatch({
          type: "UPLOAD_ERROR",
          error: err instanceof Error ? err.message : "Ошибка обработки файла"
        });
        return null;
      }
    },
    [sprintsLength]
  );

  return {
    data,
    isLoading,
    error,
    showSprintSetup,
    setError,
    setData,
    setShowSprintSetup,
    handleUpload
  };
}
