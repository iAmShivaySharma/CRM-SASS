type MinioClient = any

export const envVars = {
  endpoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: process.env.MINIO_PORT || '9000',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  bucketName: process.env.MINIO_BUCKET_NAME || 'crm-files',
  useSSL: process.env.MINIO_USE_SSL || 'false',
  publicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000',
}

export const minioConfig = {
  endPoint: envVars.endpoint,
  port: parseInt(envVars.port),
  useSSL: envVars.useSSL === 'true',
  accessKey: envVars.accessKey,
  secretKey: envVars.secretKey,
}

export const bucketName = envVars.bucketName
export const publicUrl = envVars.publicUrl

let minioClient: MinioClient | null = null

async function getMinioClient(): Promise<MinioClient> {
  if (!minioClient) {
    try {
      const Minio = await import('minio')
      minioClient = new Minio.Client(minioConfig)
    } catch (error) {
      throw new Error(
        `MinIO client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
  return minioClient
}

export { getMinioClient }

export const ALLOWED_FILE_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
  archives: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ],
}

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_FILE_TYPES.images,
  ...ALLOWED_FILE_TYPES.documents,
  ...ALLOWED_FILE_TYPES.archives,
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024

export function generateSecureFilePath(
  workspaceId: string,
  userId: string,
  originalFileName: string,
  fileType: string
): string {
  const sanitizedName = originalFileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .substring(0, 100)

  const timestamp = Date.now()

  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  let folder = 'files'
  if (ALLOWED_FILE_TYPES.images.includes(fileType)) {
    folder = 'images'
  } else if (ALLOWED_FILE_TYPES.documents.includes(fileType)) {
    folder = 'documents'
  }

  return `workspaces/${workspaceId}/users/${userId}/${folder}/${year}/${month}/${timestamp}_${sanitizedName}`
}

export function validateFile(file: {
  mimetype?: string
  size: number
  name: string
}) {
  const errors: string[] = []

  if (!file.mimetype || !ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    errors.push(
      `File type not allowed: ${file.mimetype}. Allowed types: images, documents, archives`
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(
      `File size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: ${MAX_FILE_SIZE / 1024 / 1024}MB`
    )
  }

  if (!file.name || file.name.length === 0) {
    errors.push('Filename is required')
  }

  const dangerousExtensions = [
    '.exe',
    '.bat',
    '.cmd',
    '.scr',
    '.pif',
    '.jar',
    '.com',
    '.vbs',
    '.js',
    '.jse',
    '.wsf',
    '.wsh',
  ]
  const fileExtension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf('.'))

  if (dangerousExtensions.includes(fileExtension)) {
    errors.push(`Dangerous file extension not allowed: ${fileExtension}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export async function uploadFile(
  filePath: string,
  fileBuffer: Buffer,
  fileType: string,
  metadata: Record<string, string> = {}
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = await getMinioClient()
    try {
      const bucketExists = await client.bucketExists(bucketName)
    } catch (connectionError) {
      return {
        success: false,
        error: `MinIO connection failed: ${connectionError instanceof Error ? connectionError.message : 'Unknown connection error'}. Please check your MinIO server and credentials.`,
      }
    }

    const fileMetadata = {
      'Content-Type': fileType,
      'Cache-Control': 'max-age=31536000',
      ...metadata,
    }

    await client.putObject(
      bucketName,
      filePath,
      fileBuffer,
      fileBuffer.length,
      fileMetadata
    )

    const publicFileUrl = `${publicUrl}/${bucketName}/${filePath}`

    return {
      success: true,
      url: publicFileUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: `MinIO upload failed: ${error instanceof Error ? error.message : 'Upload failed'}`,
    }
  }
}

export async function deleteFile(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getMinioClient()
    await client.removeObject(bucketName, filePath)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    }
  }
}

export async function generatePresignedUrl(
  filePath: string,
  expiryInSeconds: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = await getMinioClient()
    const presignedUrl = await client.presignedGetObject(
      bucketName,
      filePath,
      expiryInSeconds
    )

    return {
      success: true,
      url: presignedUrl,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate download URL',
    }
  }
}

export async function initializeBucket(): Promise<void> {
  try {
    const client = await getMinioClient()
    const exists = await client.bucketExists(bucketName)

    if (!exists) {
      await client.makeBucket(bucketName)
    }
  } catch (error) {
    throw new Error(
      `MinIO bucket initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
