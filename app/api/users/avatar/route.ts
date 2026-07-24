import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { User } from '@/lib/mongodb/models'
import {
  uploadFile,
  generateSecureFilePath,
  validateFile,
  initializeBucket,
  ALLOWED_FILE_TYPES,
} from '@/lib/storage'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024

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
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 })
    }

    const validation = validateFile(file, ALLOWED_FILE_TYPES, MAX_AVATAR_SIZE)
    if (!validation.valid) {
      return NextResponse.json({ message: validation.error }, { status: 400 })
    }

    try {
      await initializeBucket()
    } catch (bucketError) {
      return NextResponse.json(
        { message: 'Storage service unavailable' },
        { status: 503 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = generateSecureFilePath(
      `users/${auth.user.id}/avatar`,
      file.name
    )

    const uploadResult = await uploadFile(filePath, buffer, file.type, {
      userId: auth.user.id,
    })

    if (!uploadResult.success) {
      return NextResponse.json(
        { message: 'Upload failed', error: uploadResult.error },
        { status: 500 }
      )
    }

    await User.findByIdAndUpdate(auth.user.id, {
      avatarUrl: uploadResult.url,
    })

    return NextResponse.json({
      success: true,
      avatarUrl: uploadResult.url,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to upload avatar' },
      { status: 500 }
    )
  }
}
