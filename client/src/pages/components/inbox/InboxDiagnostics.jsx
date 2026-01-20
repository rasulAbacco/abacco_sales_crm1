"use client"

import { useState } from "react"

export function InboxDiagnostics() {
  const [showDiag, setShowDiag] = useState(false)

  if (!showDiag) {
    return (
      <button
        onClick={() => setShowDiag(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs z-50 hover:bg-blue-700"
      >
        Diagnostics
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg text-xs max-w-96 max-h-64 overflow-auto z-50 font-mono">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Inbox Diagnostics</h3>
        <button onClick={() => setShowDiag(false)} className="text-red-400 hover:text-red-300">
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <strong>Account:</strong> {localStorage.getItem("selectedAccountId") || "None"}
        </div>
        <div>
          <strong>Active Chat:</strong> {localStorage.getItem("activeChat") || "None"}
        </div>
        <div>
          <strong>User:</strong> {JSON.parse(localStorage.getItem("user") || "{}")?.email || "Not logged in"}
        </div>
        <div>
          <strong>API Base:</strong> {import.meta.env.VITE_API_BASE_URL}
        </div>
      </div>

      <button
        onClick={() => {
          localStorage.clear()
          window.location.reload()
        }}
        className="mt-2 w-full bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
      >
        Clear & Reload
      </button>
    </div>
  )
}

export default InboxDiagnostics
