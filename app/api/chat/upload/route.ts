import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WorkspaceMember } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  uploadFile,
  generateSecureFilePath,
  validateFile,
  initializeBucket,
  ALL_ALLOWED_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/storage/minio'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting file upload process...')

    // Verify authentication
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get workspace ID and chat room ID from query params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const chatRoomId = searchParams.get('chatRoomId')

    console.log('Upload params:', {
      workspaceId,
      chatRoomId,
      userId: auth.user._id,
    })

    if (!workspaceId || !chatRoomId) {
      return NextResponse.json(
        { message: 'Workspace ID and Chat Room ID are required' },
        { status: 400 }
      )
    }

    // Verify user is member of workspace
    const member = await WorkspaceMember.findOne({
      userId: auth.user._id,
      workspaceId,
      status: 'active',
    })

    if (!member) {
      return NextResponse.json(
        { message: 'Not authorized for this workspace' },
        { status: 403 }
      )
    }

    // Parse form data from request
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Security validation
    const validation = validateFile({
      mimetype: file.type,
      size: file.size,
      name: file.name,
    })

    if (!validation.isValid) {
      console.log('File validation failed:', validation.errors)
      return NextResponse.json(
        {
          message: 'File validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      )
    }

    // Initialize MinIO bucket
    console.log('Initializing MinIO bucket...')
    try {
      await initializeBucket()
      console.log('MinIO bucket initialized successfully')
    } catch (bucketError) {
      console.error('MinIO bucket initialization failed:', bucketError)
      return NextResponse.json(
        {
          message: 'MinIO service unavailable',
          error: `Bucket initialization failed: ${bucketError instanceof Error ? bucketError.message : 'Unknown bucket error'}`,
          details: 'Please check MinIO server is running and accessible',
        },
        { status: 503 }
      )
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    console.log('File converted to buffer, size:', fileBuffer.length)

    // Generate secure file path
    const secureFilePath = generateSecureFilePath(
      workspaceId,
      auth.user._id,
      file.name,
      file.type
    )

    console.log('Generated secure file path:', secureFilePath)

    // Upload to MinIO
    console.log('Uploading to MinIO...')
    const uploadResult = await uploadFile(
      secureFilePath,
      fileBuffer,
      file.type,
      {
        'uploaded-by': auth.user._id,
        'uploaded-by-name': auth.user.fullName || auth.user.email,
        'workspace-id': workspaceId,
        'chat-room-id': chatRoomId,
        'original-name': file.name,
        'upload-date': new Date().toISOString(),
      }
    )

    console.log('MinIO upload result:', uploadResult)

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          message: 'File upload to MinIO failed',
          error: uploadResult.error,
          details: 'MinIO server connection or upload error',
        },
        { status: 500 }
      )
    }

    console.log('File upload successful:', uploadResult.url)

    // Return success response with file information
    return NextResponse.json({
      success: true,
      file: {
        url: uploadResult.url,
        name: file.name,
        size: file.size,
        type: file.type,
        path: secureFilePath,
      },
    })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.stack
              : ''
            : undefined,
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve upload configuration
export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      config: {
        maxFileSize: MAX_FILE_SIZE,
        allowedTypes: ALL_ALLOWED_TYPES,
        maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
        allowedExtensions: {
          images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
          documents: [
            '.pdf',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.ppt',
            '.pptx',
            '.txt',
            '.csv',
          ],
          archives: ['.zip', '.rar', '.7z'],
        },
      },
    })
  } catch (error) {
    console.error('Get upload config error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
