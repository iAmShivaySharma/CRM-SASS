import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { ProjectDocument } from '@/lib/mongodb/client'
import { DocumentVersion } from '@/lib/mongodb/models/Document'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: documentId } = await params

    const document = await ProjectDocument.findById(documentId).lean()
    if (!document) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      )
    }

    const versions = await DocumentVersion.find({ documentId })
      .sort({ version: -1 })
      .limit(50)
      .populate('createdBy', 'fullName email')
      .lean()

    return NextResponse.json({
      success: true,
      versions: (versions as any[]).map(v => ({
        id: v._id,
        version: v.version,
        title: v.title,
        createdBy: v.createdBy,
        createdAt: v.createdAt,
      })),
      currentVersion: (document as any).version || 1,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: documentId } = await params
    const { versionId } = await request.json()

    if (!versionId) {
      return NextResponse.json(
        { message: 'versionId is required' },
        { status: 400 }
      )
    }

    const document = await ProjectDocument.findById(documentId)
    if (!document) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      )
    }

    const targetVersion = await DocumentVersion.findById(versionId)
    if (!targetVersion || targetVersion.documentId !== documentId) {
      return NextResponse.json(
        { message: 'Version not found' },
        { status: 404 }
      )
    }

    await DocumentVersion.create({
      documentId,
      version: (document as any).version || 1,
      title: (document as any).title,
      content: (document as any).content,
      createdBy: auth.user.id,
    })

    const newVersion = ((document as any).version || 1) + 1
    await ProjectDocument.findByIdAndUpdate(documentId, {
      content: targetVersion.content,
      title: targetVersion.title,
      version: newVersion,
      lastEditedBy: auth.user.id,
      lastEditedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: `Restored to version ${targetVersion.version}`,
      newVersion,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to restore version' },
      { status: 500 }
    )
  }
}
