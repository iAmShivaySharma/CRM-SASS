import { ChatRoom } from '@/lib/mongodb/models'

export async function createDefaultChatRooms(
  workspaceId: string,
  createdBy: string
) {
  try {
    const existingGeneral = await ChatRoom.findOne({
      workspaceId,
      name: 'General',
      type: 'general',
    })

    if (existingGeneral) {
      return existingGeneral
    }

    const generalRoom = new ChatRoom({
      name: 'General',
      description: 'General discussion for all workspace members',
      type: 'general',
      workspaceId,
      participants: [createdBy],
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

    return generalRoom
  } catch (error) {
    throw error
  }
}

export async function addUserToDefaultChatRooms(
  workspaceId: string,
  userId: string
) {
  try {
    const generalRooms = await ChatRoom.find({
      workspaceId,
      type: 'general',
      isArchived: false,
    })

    for (const room of generalRooms) {
      if (!room.participants.includes(userId)) {
        room.participants.push(userId)
        await room.save()
      }
    }

    return generalRooms
  } catch (error) {
    throw error
  }
}
