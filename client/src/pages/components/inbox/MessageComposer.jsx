import React, { useState } from "react";
import { api } from "../../api";

export default function MessageComposer({ account, conversation, onSent }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const handleFileUpload = (e) => {
    setAttachments([...attachments, ...Array.from(e.target.files)]);
  };

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("accountId", account.id);
      formData.append("conversationId", conversation.id);
      formData.append("body", body);
      attachments.forEach((file) => formData.append("attachments", file));

      await api.post("/conversations/reply", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setBody("");
      setAttachments([]);
      onSent(conversation.id);
    } catch (err) {
      alert("Failed to send message");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-gray-800 bg-gray-900 p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full bg-gray-800 text-white rounded p-2 mb-2 resize-none h-20"
        placeholder="Write your message..."
      ></textarea>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="text-sm text-gray-300"
          />
          {attachments.length > 0 && (
            <span className="text-xs text-gray-400">
              {attachments.length} file(s) attached
            </span>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          className="px-4 py-2 bg-blue-700 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
