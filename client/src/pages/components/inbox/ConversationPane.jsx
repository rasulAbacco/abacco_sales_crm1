import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../../api";
import { Loader2, Paperclip } from "lucide-react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ConversationPane({
  conversation,
  socket,
  currentUser,
}) {
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [followUpInfo, setFollowUpInfo] = useState(null);
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);

  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const replyEditorRef = useRef(null);

  const getSenderEmail = useCallback(
    () =>
      conv?.account?.email ||
      localStorage.getItem("userEmail") ||
      currentUser?.email ||
      currentUser?.userEmail ||
      null,
    [conv, currentUser]
  );

  // ✅ Fetch conversation + messages
  const fetchConversation = useCallback(async () => {
    if (!conversation) return;
    try {
      const convRes = await api.get(
        `${API_BASE_URL}/api/conversations/${conversation.id}`
      );
      setConv(convRes.data);

      const threadRes = await api.get(
        `${API_BASE_URL}/api/conversations/${conversation.id}/thread`
      );
      setMessages(threadRes.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch conversation:", err);
    }
  }, [conversation]);

  useEffect(() => {
    if (!conversation) {
      setConv(null);
      setMessages([]);
      setSelectedEmail(null);
      return;
    }
    fetchConversation();
  }, [conversation, fetchConversation]);

  // ✅ When a client email clicked → Fetch follow-up from CRM
  const handleEmailClick = async (email) => {
    setSelectedEmail(email);
    setFollowUpInfo(null);
    setLoadingFollowUp(true);

    try {
      const res = await api.get(`${API_BASE_URL}/api/conversations/followup`, {
        params: { email },
      });
      if (res.data && res.data.followUpDate) {
        setFollowUpInfo(res.data);
      } else {
        setFollowUpInfo(null);
      }
    } catch (err) {
      console.error("Failed to fetch follow-up info:", err);
    } finally {
      setLoadingFollowUp(false);
    }
  };

  const renderHTMLContent = (html) => ({ __html: html || "" });

  // ✅ Send reply (optional)
  const sendReply = async () => {
    if (!replyContent.trim()) return alert("Message cannot be empty!");
    const senderEmail = getSenderEmail();
    const recipient = selectedEmail;
    setIsSending(true);
    try {
      await api.post(`/api/conversations/${conversation.id}/reply`, {
        fromEmail: senderEmail,
        toEmail: recipient,
        body: replyContent,
      });
      alert("✅ Reply sent!");
      setReplyContent("");
      fetchConversation();
    } catch (err) {
      console.error("Failed to send reply:", err);
      alert("❌ Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">
        Select a conversation to view details
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white text-black">
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4 border-b border-gray-300 bg-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">
            {conv?.subject || "Conversation"}
          </h1>
          <p className="text-sm text-gray-600">
            {messages[0]?.fromName || messages[0]?.from}
          </p>
        </div>
      </div>

      {/* Email Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className="bg-white border border-gray-300 rounded-lg px-5 py-4 shadow-sm hover:shadow-md transition"
              onClick={() => handleEmailClick(m.from)}
            >
              {/* Header Info */}
              <div className="mb-3 text-sm text-gray-800 space-y-1">
                <p>
                  <strong>From:</strong> {m.fromName || m.from} &lt;
                  {m.fromEmail || m.from}&gt;
                </p>
                <p>
                  <strong>To:</strong> {m.toName || m.toEmail}
                </p>
                {m.cc && (
                  <p>
                    <strong>CC:</strong> {m.cc}
                  </p>
                )}
                <p className="text-gray-500 text-xs">
                  <strong>Date:</strong>{" "}
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Message Body */}
              <div
                className="text-gray-700"
                dangerouslySetInnerHTML={renderHTMLContent(m.body)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* When an email is clicked */}
      {selectedEmail && (
        <div className="border-t border-gray-300 bg-gray-100 p-5 shadow-inner">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            📩 Follow-up Details
          </h3>

          {loadingFollowUp ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin w-5 h-5 text-gray-600" />
              <span className="ml-2 text-gray-600">Checking follow-up...</span>
            </div>
          ) : followUpInfo ? (
            <div className="space-y-2 bg-white p-4 rounded-md border border-gray-300 shadow-sm">
              <p>
                <strong>Client:</strong> {followUpInfo.client}
              </p>
              <p>
                <strong>Email:</strong> {followUpInfo.email}
              </p>
              <p>
                <strong>Follow-up Date:</strong>{" "}
                {new Date(followUpInfo.followUpDate).toLocaleDateString()}
              </p>
              <p>
                <strong>Lead Status:</strong> {followUpInfo.leadStatus || "N/A"}
              </p>

              <textarea
                ref={replyEditorRef}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                className="w-full border border-gray-300 rounded-md p-2 mt-2 h-32 focus:ring focus:ring-blue-300"
              />

              <div className="flex justify-end mt-3 space-x-2">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                >
                  Close
                </button>
                <button
                  onClick={sendReply}
                  disabled={isSending}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  {isSending && <Loader2 className="animate-spin w-4 h-4" />}
                  {isSending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white border border-gray-300 rounded-md text-gray-600">
              ❌ No follow-up found for <strong>{selectedEmail}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
