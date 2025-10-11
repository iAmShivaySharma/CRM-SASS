// Dynamic import for MinIO to avoid build-time issues
type MinioClient = any;

// Environment variables with defaults for development
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

// Lazy MinIO client initialization with dynamic import
let minioClient: MinioClient | null = null

async function getMinioClient(): Promise<MinioClient> {
  if (!minioClient) {
    try {
      console.log('Initializing MinIO client with config:', {
        endPoint: minioConfig.endPoint,
        port: minioConfig.port,
        useSSL: minioConfig.useSSL,
        accessKey: minioConfig.accessKey ? 'SET' : 'NOT_SET',
        secretKey: minioConfig.secretKey ? 'SET' : 'NOT_SET'
      })

      // Dynamic import to avoid build-time issues
      const Minio = await import('minio')
      minioClient = new Minio.Client(minioConfig)
      console.log('MinIO client initialized successfully')
    } catch (error) {
      console.error('Failed to initialize MinIO client:', error)
      throw new Error(`MinIO client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  return minioClient
}

export { getMinioClient }

// Supported file types for security
export const ALLOWED_FILE_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
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
    'text/csv'
  ],
  archives: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ]
}

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_FILE_TYPES.images,
  ...ALLOWED_FILE_TYPES.documents,
  ...ALLOWED_FILE_TYPES.archives
]

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// Security: Generate secure file path
export function generateSecureFilePath(
  workspaceId: string,
  userId: string,
  originalFileName: string,
  fileType: string
): string {
  // Sanitize filename - remove potentially dangerous characters
  const sanitizedName = originalFileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .substring(0, 100) // Limit filename length

  // Generate timestamp for uniqueness
  const timestamp = Date.now()

  // Create secure path: workspace/user/year/month/timestamp_filename
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  // Determine folder based on file type
  let folder = 'files'
  if (ALLOWED_FILE_TYPES.images.includes(fileType)) {
    folder = 'images'
  } else if (ALLOWED_FILE_TYPES.documents.includes(fileType)) {
    folder = 'documents'
  }

  return `workspaces/${workspaceId}/users/${userId}/${folder}/${year}/${month}/${timestamp}_${sanitizedName}`
}

// Security: Validate file type and size
export function validateFile(file: { mimetype?: string; size: number; name: string }) {
  const errors: string[] = []

  // Check file type
  if (!file.mimetype || !ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    errors.push(`File type not allowed: ${file.mimetype}. Allowed types: images, documents, archives`)
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  // Check filename
  if (!file.name || file.name.length === 0) {
    errors.push('Filename is required')
  }

  // Check for dangerous file extensions regardless of mimetype
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.jar', '.com', '.vbs', '.js', '.jse', '.wsf', '.wsh']
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

  if (dangerousExtensions.includes(fileExtension)) {
    errors.push(`Dangerous file extension not allowed: ${fileExtension}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Upload file to MinIO
export async function uploadFile(
  filePath: string,
  fileBuffer: Buffer,
  fileType: string,
  metadata: Record<string, string> = {}
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    console.log('Starting MinIO upload process...')
    console.log('Upload parameters:', {
      filePath,
      bufferSize: fileBuffer.length,
      fileType,
      metadata
    })

    // Test MinIO connection first
    console.log('Testing MinIO connection...')
    const client = await getMinioClient()
    try {
      const bucketExists = await client.bucketExists(bucketName)
      console.log(`Bucket '${bucketName}' exists:`, bucketExists)
    } catch (connectionError) {
      console.error('MinIO connection test failed:', connectionError)
      return {
        success: false,
        error: `MinIO connection failed: ${connectionError instanceof Error ? connectionError.message : 'Unknown connection error'}. Please check your MinIO server and credentials.`
      }
    }

    // Set metadata for the file
    const fileMetadata = {
      'Content-Type': fileType,
      'Cache-Control': 'max-age=31536000', // 1 year cache
      ...metadata
    }

    console.log('File metadata:', fileMetadata)

    // Upload file to MinIO
    console.log('Uploading file to MinIO...')
    await client.putObject(
      bucketName,
      filePath,
      fileBuffer,
      fileBuffer.length,
      fileMetadata
    )

    console.log('File uploaded successfully to MinIO')

    // Generate public URL
    const publicFileUrl = `${publicUrl}/${bucketName}/${filePath}`
    console.log('Generated public URL:', publicFileUrl)

    return {
      success: true,
      url: publicFileUrl
    }
  } catch (error) {
    console.error('MinIO upload error details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })

    return {
      success: false,
      error: `MinIO upload failed: ${error instanceof Error ? error.message : 'Upload failed'}`
    }
  }
}

// Delete file from MinIO
export async function deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getMinioClient()
    await client.removeObject(bucketName, filePath)
    return { success: true }
  } catch (error) {
    console.error('MinIO delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

// Generate presigned URL for secure download
export async function generatePresignedUrl(
  filePath: string,
  expiryInSeconds: number = 3600 // 1 hour default
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
      url: presignedUrl
    }
  } catch (error) {
    console.error('MinIO presigned URL error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate download URL'
    }
  }
}

// Initialize bucket if it doesn't exist
export async function initializeBucket(): Promise<void> {
  try {
    console.log('Initializing MinIO bucket...')
    console.log('MinIO configuration check:', {
      endPoint: minioConfig.endPoint,
      port: minioConfig.port,
      useSSL: minioConfig.useSSL,
      bucketName,
      publicUrl
    })

    const client = await getMinioClient()
    console.log('Checking if bucket exists...')
    const exists = await client.bucketExists(bucketName)
    console.log(`Bucket '${bucketName}' exists:`, exists)

    if (!exists) {
      console.log(`Creating bucket '${bucketName}'...`)
      await client.makeBucket(bucketName)
      console.log(`MinIO bucket '${bucketName}' created successfully`)
    } else {
      console.log(`MinIO bucket '${bucketName}' already exists`)
    }
  } catch (error) {
    console.error('MinIO bucket initialization error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    throw new Error(`MinIO bucket initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}