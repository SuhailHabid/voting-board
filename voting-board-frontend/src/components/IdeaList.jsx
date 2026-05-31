import IdeaCard from './IdeaCard'

export default function IdeaList({ ideas }) {
  if (ideas.length === 0) {
    return (
      <p className="text-center text-gray-400 py-12">
        No ideas yet. Be the first to add one!
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {ideas.map(idea => (
        <IdeaCard key={idea.id} idea={idea} />
      ))}
    </div>
  )
}