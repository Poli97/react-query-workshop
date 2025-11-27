import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { bookQueries } from './api/openlibrary'
import './styles.css'
import { del, get, set } from 'idb-keyval'
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

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      persist?: boolean
    }
  }
}

//with PersistQueryClientProvider we can persist the cache in localStorage so that even when changing page or reloading the app
//the cache is still there
//if the query is not used for 5 minutes, it will be garbage collected from the storage
const persister = createAsyncStoragePersister({
  //with custom idb-keyval we store the data in indexedDB
  storage: {
    getItem: get,
    setItem: set,
    removeItem: del,
  },
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
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              //it's also fine to leave out defaultShouldDehydrateQuery
              return (
                defaultShouldDehydrateQuery(query) &&
                query.meta?.persist === true
              )
            },
          },
        }}
      >
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
    </StrictMode>,
  )
}
