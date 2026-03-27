import { useInfiniteQuery } from '@tanstack/react-query'
import { chatsApi } from '@/api/chats'
import { QUERY_KEYS } from '@/config'

export function useChatMedia(chatId: string) {
  const query = useInfiniteQuery({
    queryKey: [...QUERY_KEYS.CHAT(chatId), 'media'],
    queryFn: ({ pageParam }) => chatsApi.getMedia(chatId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
  })

  const media = query.data?.pages.flatMap((p) => p.items) ?? []

  return { ...query, media }
}
