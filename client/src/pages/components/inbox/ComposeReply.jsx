"use client"

// Simple reply composer component
import React from "react"
import { Send, Paperclip } from "lucide-react"

export default function ComposeReply({ onSend, onClose }) {
  const [text, setText] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)

  const handleSend = async () => {
    if (!text.trim()) return
    setIsSending(true)
    await onSend(text)
    setText("")
    setIsSending(false)
  }

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <div className="flex gap-2 items-end">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition">
          <Paperclip className="w-5 h-5 text-gray-600" />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your reply..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={isSending || !text.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
