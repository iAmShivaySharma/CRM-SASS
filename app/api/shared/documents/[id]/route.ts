import { NextRequest, NextResponse } from 'next/server'
import { ProjectDocument, Project } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== PUBLIC DOCUMENT API DEBUG START ===')
    const { id } = await params

    if (!id) {
      console.log('No document ID provided')
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    console.log('Connecting to MongoDB...')
    await connectToMongoDB()
    console.log('MongoDB connected successfully')

    console.log('Fetching document with ID:', id)
    // Get the document without requiring authentication
    const document = await ProjectDocument.findById(id)

    if (!document) {
      console.log('Document not found in database')
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    console.log('Document found:', document.title)

    // Get project name for context
    let projectName = 'Unknown Project'
    if (document.projectId) {
      console.log('Fetching project with ID:', document.projectId)
      const project = await Project.findById(document.projectId)
      projectName = project?.name || 'Unknown Project'
      console.log('Project found:', projectName)
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

    console.log('Returning public document data')
    return NextResponse.json({ document: publicDocument })
  } catch (error) {
    console.error('=== PUBLIC DOCUMENT API ERROR ===')
    console.error('Error fetching public document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}