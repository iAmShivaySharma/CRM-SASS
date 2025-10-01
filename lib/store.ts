import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query/react'
import { mongoApi } from './api/mongoApi'
import { userPreferencesApi } from './api/userPreferencesApi'
import { webhookApi } from './api/webhookApi'
import { authApi } from './api/authApi'
import { contactsApi } from './api/contactsApi'
import { workspaceApi } from './api/workspaceApi'
import { analyticsApi } from './api/analyticsApi'
import { notificationsApi } from './api/notificationsApi'
import { chatApi } from './api/chatApi'
import { roleApi } from './api/roleApi'
import authReducer from './slices/authSlice'
import themeReducer from './slices/themeSlice'
import workspaceReducer from './slices/workspaceSlice'
// No persistence middleware needed - using RTK Query for server sync

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    workspace: workspaceReducer,
    [mongoApi.reducerPath]: mongoApi.reducer,
    [userPreferencesApi.reducerPath]: userPreferencesApi.reducer,
    [webhookApi.reducerPath]: webhookApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [contactsApi.reducerPath]: contactsApi.reducer,
    [workspaceApi.reducerPath]: workspaceApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
    [roleApi.reducerPath]: roleApi.reducer,
  } as any,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(
      mongoApi.middleware,
      userPreferencesApi.middleware,
      webhookApi.middleware,
      authApi.middleware,
      contactsApi.middleware,
      workspaceApi.middleware,
      analyticsApi.middleware,
      notificationsApi.middleware,
      chatApi.middleware,
      roleApi.middleware
    ),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
