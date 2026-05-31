import { useMutation, useQueryClient } from '@tanstack/react-query'
import { castVote, removeVote } from '../api'

const votedBtn = "w-10 h-10 rounded-lg flex items-center justify-center transition-colors bg-blue-600 text-white hover:bg-blue-700"
const unvotedBtn = "w-10 h-10 rounded-lg flex items-center justify-center transition-colors bg-gray-100 text-gray-500 hover:bg-gray-200"

export default function IdeaCard({ idea }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => idea.has_voted ? removeVote(idea.id) : castVote(idea.id),

    // This fires before the server call, update the cache immediately
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['ideas'] })

      const previous = queryClient.getQueriesData({ queryKey: ['ideas'] })

      // This wil update the cache optimistically
      queryClient.setQueriesData({ queryKey: ['ideas'] }, (old) => {
        if (!old) return old
        return old.map(i => {
          if (i.id !== idea.id) return i
          return {
            ...i,
            has_voted: !i.has_voted,
            vote_count: i.has_voted ? i.vote_count - 1 : i.vote_count + 1
          }
        })
      })

      return { previous }
    },

    onError: (err, variables, context) => {
      if (context?.previous) {
        context.previous.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
    }
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4">
      <div className="flex flex-col items-center gap-1 min-w-12">
        <button
          onClick={() => mutation.mutate()}
          className={idea.has_voted ? votedBtn : unvotedBtn}
        >
          ▲
        </button>
        <span className="text-sm font-bold text-gray-700">{idea.vote_count}</span>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{idea.title}</h3>
        <p className="text-gray-500 text-sm mb-2">{idea.description}</p>
        <p className="text-xs text-gray-400">
          by {idea.created_by || 'Deleted user'} · {new Date(idea.created_at).toLocaleDateString()}
        </p>
        {mutation.isError && (
          <p className="text-red-500 text-xs mt-1">Vote failed</p>
        )}
      </div>
    </div>
  )
}