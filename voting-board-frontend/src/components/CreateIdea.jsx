import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createIdea } from '../api'

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

export default function CreateIdea({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => createIdea(title, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      setTitle('')
      setDescription('')
      setOpen(false)
      onCreated()
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    mutation.mutate()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors mb-4"
      >
        + Add new idea
      </button>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 pb-5">
      <h3 className="font-semibold text-gray-900 mb-3">New idea</h3>

      {mutation.isError && (
        <p className="text-red-500 text-sm mb-3">Failed to create idea</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="Short, descriptive title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className={inputClass + " resize-none"} placeholder="What's your idea?" rows={3} />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={mutation.isPending} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {mutation.isPending ? 'Submitting...' : 'Submit'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}