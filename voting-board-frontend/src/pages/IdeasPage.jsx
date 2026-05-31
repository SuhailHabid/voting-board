import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getIdeas } from '../api'
import IdeaList from '../components/IdeaList'
import CreateIdea from '../components/CreateIdea'

export default function IdeasPage({ onLogout }) {
  const [sort, setSort] = useState('newest')
  const queryClient = useQueryClient()

  const { data: ideas = [], isLoading, error } = useQuery({
    queryKey: ['ideas', sort],
    queryFn: () => getIdeas(sort).then(res => res.data)
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ideas'] })
  }

  const activeSortBtn = "px-4 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white"
  const inactiveSortBtn = "px-4 py-1.5 rounded-full text-sm font-medium bg-white text-gray-600 border border-gray-300 hover:border-gray-400"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Voting Board</h1>
          <button onClick={onLogout} className="text-sm text-gray-500 hover:text-gray-700">
            Logout
          </button>
        </div>

        <CreateIdea onCreated={refresh} />

        <div className="flex gap-2 mb-4">
          <button onClick={() => setSort('newest')} className={sort === 'newest' ? activeSortBtn : inactiveSortBtn}>
            Newest
          </button>
          <button onClick={() => setSort('popular')} className={sort === 'popular' ? activeSortBtn : inactiveSortBtn}>
            Most Popular
          </button>
        </div>

        {isLoading && <p className="text-center text-gray-400 py-12">Loading...</p>}
        {error && <p className="text-red-500 text-sm">Failed to load ideas.</p>}
        {!isLoading && !error && <IdeaList ideas={ideas} />}

      </div>
    </div>
  )
}