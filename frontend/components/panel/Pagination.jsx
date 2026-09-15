'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
