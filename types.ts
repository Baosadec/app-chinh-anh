export interface UploadedFile {
  file?: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  timestamp: number;
  promptUsed: string;
}

export interface GenerationResult {
  imageUrl?: string;
  text?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  GENERATING = 'GENERATING',
  REMOVING_BACKGROUND = 'REMOVING_BACKGROUND',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}