import { bookQueries, limit } from '@/api/openlibrary'
import { BookDetailItem } from '@/books/book-detail-item'
import { BookSearchItem } from '@/books/book-search-item'
import { Header } from '@/books/header'
import { Pagination } from '@/books/pagination'
import { SearchForm } from '@/books/search-form'
import {
  EmptyState,
  ErrorState,
  NoResultsState,
  PendingState,
} from '@/books/search-states'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [id, setId] = useState<string>()

  if (id) {
    return (
      <div>
        <Header />
        <BookDetail id={id} setId={setId} filter={filter} page={page} />
      </div>
    )
  }

  return (
    <div>
      <Header>
        <SearchForm
          onSearch={(newFilter) => {
            if (filter !== newFilter) {
              setFilter(newFilter)
              setPage(1)
            }
          }}
          defaultValue={filter}
        />
      </Header>
      <BookSearchOverview
        filter={filter}
        setId={setId}
        page={page}
        setPage={setPage}
      />
    </div>
  )
}

function BookSearchOverview({
  page,
  setPage,
  setId,
  filter,
}: {
  filter: string
  setId: (id: string) => void
  page: number
  setPage: (page: number) => void
}) {
  const query = useQuery({
    ...bookQueries.list({ filter, page }),
    //keepPreviousData was used before, then replaced with placeholderData for a better UX
    // keepPreviousData: true,
    //previousData: data of the previous key. It will keep the state of the previous key
    //can be seen in pagination when going to next page
    placeholderData: (previousData) =>
      previousData?.filter === filter ? previousData : undefined,
  })

  //imperative way to get the query client for imperative stuffs (callbacks...).
  // Do not use to render data
  const queryClient = useQueryClient()

  //promise result "error" | "success" | "pending"

  //it will always be in pending if no error and no datas are ready
  if (query.status === 'pending') {
    return query.fetchStatus === 'fetching' ? <PendingState /> : <EmptyState />
  }

  if (query.status === 'error') {
    return <ErrorState error={query.error} />
  }

  if (query.data.numFound === 0) {
    return <NoResultsState />
  }

  return (
    <div>
      <div className="mb-4 flex justify-end text-sm text-gray-400">
        {query.data.numFound} records found
      </div>

      <div
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        style={{
          //this is a way to show that the data is from placeholderData, so old values still not updated
          opacity: query.isPlaceholderData ? 0.5 : 1,
        }}
      >
        {query.data.docs.map((book) => (
          <BookSearchItem
            key={book.id}
            {...book}
            onClick={setId}
            onMouseEnter={() => {
              void queryClient.prefetchQuery(bookQueries.details(book.id))
            }}
          />
        ))}
      </div>

      <Pagination
        page={page}
        setPage={setPage}
        maxPages={Math.ceil(query.data.numFound / limit)}
      />
    </div>
  )
}

function BookDetail({
  setId,
  id,
  filter,
  page,
}: {
  filter: string
  page: number
  id: string
  setId: (id: string | undefined) => void
}) {
  const queryClient = useQueryClient()
  const bookQuery = useQuery({
    ...bookQueries.details(id),
    //having initialData will add values to the cache to display as a sort of "skeleton"
    //like in this example we are adding title, authorId and cover from the list query if available
    initialData: () => {
      const listData = queryClient
        .getQueryData(bookQueries.list({ filter, page }).queryKey)
        ?.docs.find((book) => book.id === id)

      return listData
        ? {
            title: listData.title,
            authorId: listData.authorId,
            covers: [listData.coverId],
          }
        : undefined
    },
  })

  const authorId = bookQuery.data?.authorId

  const authorQuery = useQuery(bookQueries.author(authorId))

  if (bookQuery.status === 'pending') {
    return <PendingState />
  }

  if (bookQuery.status === 'error') {
    return <ErrorState error={bookQuery.error} />
  }

  return (
    <div>
      <BookDetailItem
        {...bookQuery.data}
        author={authorQuery.data}
        onBack={() => {
          setId(undefined)
        }}
      />
    </div>
  )
}
