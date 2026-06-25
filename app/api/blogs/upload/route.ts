import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  uploadFile,
  generateSecureFilePath,
  initializeBucket,
} from '@/lib/storage'

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    // Validate image type and size
    if (!IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: 'Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)' },
        { status: 400 }
      )
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { message: 'Image must be under 5MB' },
        { status: 400 }
      )
    }

    await initializeBucket()

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const secureFilePath = generateSecureFilePath(
      'blog',
      auth.user._id,
      file.name,
      file.type
    )

    const uploadResult = await uploadFile(
      secureFilePath,
      fileBuffer,
      file.type,
      {
        'uploaded-by': auth.user._id,
        'original-name': file.name,
        'upload-date': new Date().toISOString(),
        context: 'blog',
      }
    )

    if (!uploadResult.success) {
      return NextResponse.json(
        { message: 'Upload failed', error: uploadResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      name: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
