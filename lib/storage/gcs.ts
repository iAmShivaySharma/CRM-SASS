let gcsClient: any = null
let gcsBucket: any = null

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || ''
const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID || ''
const GCS_PUBLIC_URL =
  process.env.GCS_PUBLIC_URL ||
  `https://storage.googleapis.com/${GCS_BUCKET_NAME}`

async function getGCSBucket() {
  if (!gcsBucket) {
    const { Storage } = await import('@google-cloud/storage')

    gcsClient = new Storage({ projectId: GCS_PROJECT_ID })
    gcsBucket = gcsClient.bucket(GCS_BUCKET_NAME)
  }
  return gcsBucket
}

export async function initializeBucketGCS(): Promise<void> {
  const bucket = await getGCSBucket()
  const [exists] = await bucket.exists()
  if (!exists) {
    await bucket.create()
  }
}

export async function uploadFileGCS(
  filePath: string,
  fileBuffer: Buffer,
  fileType: string,
  metadata: Record<string, string> = {}
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const bucket = await getGCSBucket()
    const file = bucket.file(filePath)

    await file.save(fileBuffer, {
      contentType: fileType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
        metadata,
      },
      resumable: false,
    })

    try {
      await file.makePublic()
    } catch {}

    const publicFileUrl = `${GCS_PUBLIC_URL}/${filePath}`

    return { success: true, url: publicFileUrl }
  } catch (error) {
    return {
      success: false,
      error: `GCS upload failed: ${error instanceof Error ? error.message : 'Upload failed'}`,
    }
  }
}

export async function deleteFileGCS(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const bucket = await getGCSBucket()
    await bucket.file(filePath).delete()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    }
  }
}

export async function generatePresignedUrlGCS(
  filePath: string,
  expiryInSeconds: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const bucket = await getGCSBucket()
    const [url] = await bucket.file(filePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + expiryInSeconds * 1000,
    })
    return { success: true, url }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate URL',
    }
  }
}
