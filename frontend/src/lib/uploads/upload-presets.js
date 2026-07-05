const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB || 25);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const uploadPresets = {
  organizationVerification: {
    maxFiles: 1,
    maxSize: MAX_UPLOAD_BYTES,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
  },
  courseResources: {
    maxFiles: 10,
    maxSize: MAX_UPLOAD_BYTES,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "video/mp4": [".mp4"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
  },
  messageAttachments: {
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "text/plain": [".txt"],
    },
  },
  profileMedia: {
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
  },
};

export function getUploadPreset(name, overrides = {}) {
  return {
    ...(uploadPresets[name] || {}),
    ...overrides,
  };
}
