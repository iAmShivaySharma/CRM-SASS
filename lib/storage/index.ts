
import {
  uploadFile as uploadFileMinio,
  deleteFile as deleteFileMinio,
  generatePresignedUrl as generatePresignedUrlMinio,
  initializeBucket as initializeBucketMinio,
  generateSecureFilePath,
  validateFile,
  ALL_ALLOWED_TYPES,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
} from './minio'

import {
  uploadFileGCS,
  deleteFileGCS,
  generatePresignedUrlGCS,
  initializeBucketGCS,
} from './gcs'

const provider = process.env.STORAGE_PROVIDER || 'minio'

export async function uploadFile(
  filePath: string,
  fileBuffer: Buffer,
  fileType: string,
  metadata: Record<string, string> = {}
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (provider === 'gcs') {
    return uploadFileGCS(filePath, fileBuffer, fileType, metadata)
  }
  return uploadFileMinio(filePath, fileBuffer, fileType, metadata)
}

export async function deleteFile(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  if (provider === 'gcs') {
    return deleteFileGCS(filePath)
  }
  return deleteFileMinio(filePath)
}

export async function generatePresignedUrl(
  filePath: string,
  expiryInSeconds: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (provider === 'gcs') {
    return generatePresignedUrlGCS(filePath, expiryInSeconds)
  }
  return generatePresignedUrlMinio(filePath, expiryInSeconds)
}

export async function initializeBucket(): Promise<void> {
  if (provider === 'gcs') {
    return initializeBucketGCS()
  }
  return initializeBucketMinio()
}

export {
  generateSecureFilePath,
  validateFile,
  ALL_ALLOWED_TYPES,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
}
