import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { bookQueries } from './api/openlibrary'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      //garbage collection time before cache is removed from memory
      gcTime: 60 * 60 * 1000, // 60 minutes
    },
  },
})

//query keys works with
//reaso why query keys are arrays is becaues it's easyer to do matching and partial matching
//E.g:
queryClient.setQueryDefaults(bookQueries.all(), {
  staleTime: 2 * 60 * 1000, // 2 minutes
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  defaultGcTime: 0,
  defaultPendingMinMs: 0,
  defaultPendingMs: 100,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

//with PersistQueryClientProvider we can persist the cache in localStorage so that even when changing page or reloading the app
//the cache is still there
//if the query is not used for 5 minutes, it will be garbage collected from the storage
const persister = createAsyncStoragePersister({
  storage: localStorage,
})

// Render the app
const rootElement = document.querySelector('#app')
if (rootElement && !rootElement.innerHTML) {
  const root = createRoot(rootElement)
  await (await import('@/server/handlers')).worker.start()
  root.render(
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
        }}
      >
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
    </StrictMode>,
  )
}
