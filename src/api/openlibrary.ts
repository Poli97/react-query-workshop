import { queryOptions, skipToken } from '@tanstack/react-query'
import ky from 'ky'

export const limit = 6

export type BookSearchItem = Awaited<
  ReturnType<typeof getBooks>
>['docs'][number]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getBooks({
  filter,
  page,
}: {
  filter: string
  page: number
}) {
  const params = new URLSearchParams({
    q: filter,
    page: String(page),
    limit: String(limit),
    has_fulltext: 'true',
    fields: 'key,title,author_name,author_key,first_publish_year,cover_i',
  })
  const { q, ...response } = await ky
    .get(`https://openlibrary.org/search.json?${params.toString()}`)
    .json<{
      numFound: number
      q: string
      docs: Array<{
        key: string
        title: string
        author_name?: Array<string>
        author_key?: Array<string>
        coverId: string
        first_publish_year: number
        cover_i: number
      }>
    }>()

  await sleep(500)

  return {
    ...response,
    filter: q,
    docs: response.docs.map((doc) => ({
      id: doc.key,
      coverId: doc.cover_i,
      authorName: doc.author_name?.[0],
      authorId: doc.author_key?.[0]
        ? `/authors/${doc.author_key[0]}`
        : undefined,
      title: doc.title,
      publishYear: doc.first_publish_year,
    })),
  }
}

export type BookDetailItem = Awaited<ReturnType<typeof getBook>>

export async function getBook(id: string) {
  const response = await ky.get(`https://openlibrary.org${id}.json`).json<{
    title: string
    description?: string | { value: string }
    covers?: Array<number>
    links?: Array<{ title: string; url: string }>
    authors?: Array<{ author: { key: string } }>
  }>()

  await sleep(250)

  const description =
    (typeof response.description === 'string'
      ? response.description
      : response.description?.value) ?? 'No description available'

  return {
    title: response.title,
    ...(description
      ? { description: description.replaceAll(String.raw`\n`, '\n') }
      : undefined),
    covers: response.covers?.filter((cover) => cover > 0) ?? [],
    ...(response.links ? { links: response.links } : undefined),
    authorId: response.authors?.[0]?.author.key,
  }
}

export type Author = Awaited<ReturnType<typeof getAuthor>>

export async function getAuthor(id: string) {
  const response = await ky.get(`https://openlibrary.org${id}.json`).json<{
    personal_name: string
    links?: Array<{ url: string }>
  }>()

  await sleep(1000)

  const link = response.links?.map((link) => ({
    url: link.url,
  }))[0]?.url

  return {
    name: response.personal_name,
    ...(link ? { link } : undefined),
  }
}

//you can tell the queries where to read datas from.
//for example when you already have some infos about the author you can pass them directly
export const bookQueries = {
  all: () => ['books'],

  author: (authorId: string | undefined) => {
    return queryOptions({
      queryKey: ['authors', 'detail', authorId],
      queryFn: authorId ? () => getAuthor(authorId) : skipToken,
      staleTime: 20 * 60 * 1000,
    })
  },

  list: (params: Parameters<typeof getBooks>[0]) => {
    return queryOptions({
      queryKey: ['books', 'list', params],
      queryFn: () => getBooks(params),
    })
  },

  details: (bookId: string) => {
    return queryOptions({
      queryKey: ['books', 'detail', bookId],
      queryFn: () => getBook(bookId),
    })
  },
}
