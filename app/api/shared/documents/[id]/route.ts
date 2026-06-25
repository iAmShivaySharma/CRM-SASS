import { type NextRequest, NextResponse } from 'next/server'
import { ProjectDocument, Project } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    await connectToMongoDB()

    // Get the document without requiring authentication
    const document = await ProjectDocument.findById(id)

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get project name for context
    let projectName = 'Unknown Project'
    if (document.projectId) {
      const project = await Project.findById(document.projectId)
      projectName = project?.name || 'Unknown Project'
    }

    // Return only public information
    const publicDocument = {
      id: document._id.toString(),
      title: document.title,
      content: document.content,
      type: document.type,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      projectName,
    }

    return NextResponse.json({ document: publicDocument })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
