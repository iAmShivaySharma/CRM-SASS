import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query/react'
import { api } from './api/index'
import './api/authApi'
import './api/contactsApi'
import './api/analyticsApi'
import './api/chatApi'
import './api/attendanceApi'
import './api/assetApi'
import './api/commentsApi'
import './api/appointmentApi'
import './api/calendarApi'
import './api/blogApi'
import './api/complianceApi'
import './api/campaignApi'
import './api/callsApi'
import './api/mongoApi'
import './api/dealsApi'
import './api/documentsApi'
import './api/emailApi'
import './api/emailSequencesApi'
import './api/employeesApi'
import './api/enginesApi'
import './api/fmcgApi'
import './api/inventoryApi'
import './api/invoiceApi'
import './api/leadFormApi'
import './api/leaveApi'
import './api/notificationsApi'
import './api/projectMembersApi'
import './api/projectsApi'
import './api/quotationApi'
import './api/referralsApi'
import './api/roleApi'
import './api/shiftsApi'
import './api/smsApi'
import './api/socialApi'
import './api/tasksApi'
import './api/userPreferencesApi'
import './api/webhookApi'
import './api/whatsappApi'
import './api/workspaceApi'
import authReducer from './slices/authSlice'
import themeReducer from './slices/themeSlice'
import workspaceReducer from './slices/workspaceSlice'
import {
  loadPersistedState,
  persistenceMiddleware,
} from './middleware/persistenceMiddleware'

const preloadedState = loadPersistedState()

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    workspace: workspaceReducer,
    [api.reducerPath]: api.reducer,
  } as any,
  preloadedState,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(
      persistenceMiddleware,
      api.middleware
    ),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
