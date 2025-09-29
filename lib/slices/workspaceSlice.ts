import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Workspace {
  id: string
  name: string
  plan: string
  memberCount: number
  currency?: string
  timezone?: string
  settings?: {
    dateFormat: string
    timeFormat: string
    weekStartsOn: number
    language: string
  }
  createdAt: string
}

interface WorkspaceState {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
}

const initialState: WorkspaceState = {
  currentWorkspace: null,
  workspaces: [],
}

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.currentWorkspace = action.payload
    },
    setWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.workspaces = action.payload
    },
    addWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.workspaces.push(action.payload)
    },
    updateWorkspace: (state, action: PayloadAction<Workspace>) => {
      const index = state.workspaces.findIndex(w => w.id === action.payload.id)
      if (index !== -1) {
        state.workspaces[index] = action.payload
      }
    },
  },
})

export const {
  setCurrentWorkspace,
  setWorkspaces,
  addWorkspace,
  updateWorkspace,
} = workspaceSlice.actions
export { workspaceSlice }
export default workspaceSlice.reducer
