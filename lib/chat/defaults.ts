import { ChatRoom } from '@/lib/mongodb/models'

export async function createDefaultChatRooms(workspaceId: string, createdBy: string) {
  try {
    // Check if General room already exists
    const existingGeneral = await ChatRoom.findOne({
      workspaceId,
      name: 'General',
      type: 'general',
    })

    if (existingGeneral) {
      console.log('General chat room already exists for workspace:', workspaceId)
      return existingGeneral
    }

    // Create default General chat room
    const generalRoom = new ChatRoom({
      name: 'General',
      description: 'General discussion for all workspace members',
      type: 'general',
      workspaceId,
      participants: [createdBy], // Start with the workspace creator
      admins: [createdBy],
      isArchived: false,
      settings: {
        allowFileSharing: true,
        allowReactions: true,
        retentionDays: 365,
        notifications: true,
      },
      createdBy,
    })

    await generalRoom.save()
    console.log('Created default General chat room for workspace:', workspaceId)

    return generalRoom
  } catch (error) {
    console.error('Error creating default chat rooms:', error)
    throw error
  }
}

export async function addUserToDefaultChatRooms(workspaceId: string, userId: string) {
  try {
    // Add user to all general (public) chat rooms in the workspace
    const generalRooms = await ChatRoom.find({
      workspaceId,
      type: 'general',
      isArchived: false,
    })

    for (const room of generalRooms) {
      if (!room.participants.includes(userId)) {
        room.participants.push(userId)
        await room.save()
        console.log(`Added user ${userId} to chat room: ${room.name}`)
      }
    }

    return generalRooms
  } catch (error) {
    console.error('Error adding user to default chat rooms:', error)
    throw error
  }
}