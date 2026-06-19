import { useState, useCallback } from "react";

interface UploadResponse {
  uploadURL: string;
  objectPath: string;  // relative: /objects/uploads/uuid
  publicUrl: string;   // full: https://host/objects/uploads/uuid
  metadata: { name: string; size?: number; contentType: string };
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const requestUploadUrl = useCallback(async (file: File): Promise<UploadResponse> => {
    const resp = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
      }),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || "Failed to get upload URL");
    }

    return resp.json();
  }, []);

  const uploadToPresignedUrl = useCallback(async (file: File, uploadURL: string): Promise<void> => {
    const resp = await fetch(uploadURL, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
    if (!resp.ok) throw new Error("Failed to upload file to storage");
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setError(null);

    try {
      const uploadResponse = await requestUploadUrl(file);
      await uploadToPresignedUrl(file, uploadResponse.uploadURL);

      // Ensure publicUrl exists (fallback for older server versions)
      if (!uploadResponse.publicUrl) {
        uploadResponse.publicUrl = `${window.location.origin}${uploadResponse.objectPath}`;
      }

      options.onSuccess?.(uploadResponse);
      return uploadResponse;
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Upload failed");
      setError(e);
      options.onError?.(e);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [requestUploadUrl, uploadToPresignedUrl, options]);

  return { uploadFile, isUploading, error };
}
