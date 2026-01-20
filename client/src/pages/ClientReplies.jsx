import React, { useEffect, useState } from "react";

export default function ClientReplies() {
  const [replies, setReplies] = useState([]);

  useEffect(() => {
    // Dummy data (later from backend /api/messages/replies)
    setReplies([
      {
        id: 1,
        client: "John Doe",
        fromEmail: "john@example.com",
        subject: "Re: Product Demo Schedule",
        body: "Thanks for the details, let’s schedule a meeting tomorrow.",
        date: "2025-10-16T10:45:00",
      },
      {
        id: 2,
        client: "Ravi Sharma",
        fromEmail: "ravi@company.com",
        subject: "Re: Quotation Follow-up",
        body: "Please revise pricing for bulk orders.",
        date: "2025-10-17T12:30:00",
      },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50 p-6">
      <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
        Client Replies & Conversations
      </h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {replies.map((reply) => (
          <div
            key={reply.id}
            className="bg-white rounded-xl shadow-md hover:shadow-lg p-5 border border-gray-100 transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800 truncate">
                {reply.client}
              </h3>
              <span className="text-xs text-gray-400">
                {new Date(reply.date).toLocaleDateString()}{" "}
                {new Date(reply.date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm text-blue-600 font-medium mb-1">
              {reply.subject}
            </p>
            <p className="text-sm text-gray-700 line-clamp-3">
              {reply.body}
            </p>
            <div className="mt-3 flex justify-end">
              <button
                className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
                onClick={() => alert(`Replying to ${reply.fromEmail}`)}
              >
                Reply
              </button>
            </div>
          </div>
        ))}
      </div>

      {replies.length === 0 && (
        <p className="text-center text-gray-500 mt-10">
          📭 No client replies yet
        </p>
      )}
    </div>
  );
}
