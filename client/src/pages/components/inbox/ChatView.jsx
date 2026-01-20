"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import {
  Send,
  Paperclip,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  CheckCheck,
  FileText,
  Plus,
} from "lucide-react"
import DOMPurify from "dompurify"
import { api } from "../../api"
import ScheduleModal from "../inbox/ScheduleModal"
import FollowUpEditModal from "../../components/FollowUpEditModal"
import { getSocket } from "../../../sockets"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function collapseQuotedContent(html) {
  if (!html) return html

  // Collapse Gmail/HTML blockquotes
  html = html.replace(
    /<blockquote[^>]*?>([\s\S]*?)<\/blockquote>/gim,
    `
      <details style="margin-top:12px;">
        <summary style="cursor:pointer; color:#5f6368; font-size:13px;">
          ▼ Show previous message
        </summary>
        <div style="margin-top:8px; border-left:2px solid #dadce0; padding-left:10px;">
          $1
        </div>
      </details>
    `,
  )

  // Collapse all forwarded message styles (Gmail, Outlook, Zoho, Apple Mail)
  html = html.replace(
    /([-]{2,}\s*Forwarded message\s*[-]{2,}|From:\s.*?Sent:\s.*?To:\s.*?Subject:)([\s\S]*)/gim,
    `
      <details style="margin-top:12px;">
        <summary style="cursor:pointer; color:#5f6368; font-size:13px;">
          ▼ Show forwarded content
        </summary>
        <div style="margin-top:8px; border-left:2px solid #dadce0; padding-left:10px;">
          $2
        </div>
      </details>
    `,
  )

  return html
}

/* ============================================================
   🖼️ FULL-SCREEN IMAGE VIEWER
   ============================================================ */
function ImageViewer({ images, index, onClose, onPrev, onNext }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") onNext()
      if (e.key === "ArrowLeft") onPrev()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose, onNext, onPrev])

  // 🧩 Fetch lead data when Edit Window is opened
  useEffect(() => {
    const handleOpenEdit = async () => {
      const storedLead = localStorage.getItem("editingLead")
      if (!storedLead) return

      const lead = JSON.parse(storedLead)

      try {
        const res = await fetch(`${API_BASE_URL}/api/leads/by-email/${lead.email}`)
        const data = await res.json()

        if (data.success && data.data) {
          const fetchedLead = data.data
          // setEditForm({
          //   id: fetchedLead.id,
          //   client: fetchedLead.client || "",
          //   email: fetchedLead.email || "",
          //   cc: fetchedLead.cc || "",
          //   phone: fetchedLead.phone || "",
          //   subject: fetchedLead.subject || "",
          //   body: fetchedLead.body || "",
          //   response: fetchedLead.response || "",
          //   leadStatus: fetchedLead.leadStatus || "",
          //   result: fetchedLead.result || "pending",
          //   day: fetchedLead.day || "",
          //   followUpDate: fetchedLead.followUpDate
          //     ? new Date(fetchedLead.followUpDate).toISOString().split("T")[0]
          //     : "",
          // });
          // setShowEditWindow(true);
        } else {
          alert("No lead details found for this email.")
        }
      } catch (err) {
        console.error("❌ Failed to fetch lead for edit:", err)
      }
    }

    window.addEventListener("openEditWindow", handleOpenEdit)
    return () => window.removeEventListener("openEditWindow", handleOpenEdit)
  }, [])

  if (!images.length) return null
  const img = images[index]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center backdrop-blur-md"
        style={{ zIndex: 9998 }}
      >
        {/* Header */}
        <div className="w-full flex justify-between items-center px-6 py-4 bg-gradient-to-b from-black/40 to-transparent backdrop-blur-sm">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white text-sm font-semibold hover:text-red-400 transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" /> Close
          </button>
          <div className="flex-1 text-center">
            <p className="text-gray-300 text-sm font-medium truncate max-w-md mx-auto">{img.filename}</p>
            <p className="text-gray-500 text-xs mt-1">
              {index + 1} of {images.length}
            </p>
          </div>
          <button
            onClick={() => window.open(img.url, "_blank")}
            className="flex items-center gap-2 text-white text-sm font-semibold hover:text-blue-400 transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>

        {/* Image Display */}
        <div className="flex-1 flex items-center justify-center w-full px-6 relative overflow-hidden">
          <button
            onClick={onPrev}
            className="absolute left-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all z-10 hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          <div className="max-h-[85vh] max-w-[90vw]">
            <TransformWrapper
              initialScale={1}
              wheel={{ step: 0.2 }}
              pinch={{ step: 0.3 }}
              doubleClick={{ mode: "toggle" }}
              centerOnInit
            >
              <TransformComponent>
                <img
                  src={img.url || "/placeholder.svg"}
                  alt={img.filename}
                  className="object-contain rounded-xl shadow-2xl select-none max-h-[85vh] max-w-[90vw]"
                  draggable="false"
                />
              </TransformComponent>
            </TransformWrapper>
          </div>

          <button
            onClick={onNext}
            className="absolute right-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all z-10 hover:scale-110"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="pb-6 text-xs text-gray-400 text-center">
          Use arrow keys to navigate • Scroll to zoom • Double-click to reset
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ============================================================
   💬 MAIN CHAT VIEW
   ============================================================ */
export default function ChatView({ selectedAccount, clientEmail, onBack, selectedTab }) {
  const lastMessageRef = useRef(null)

  const scrollRef = useRef(null)
  const editorRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [subject, setSubject] = useState("")
  const [conversationSubject, setConversationSubject] = useState("") // New state for conversation subject
  const [replyBody, setReplyBody] = useState("")
  const [replying, setReplying] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [followUpInfo, setFollowUpInfo] = useState(null)
  const [loadingFollowUp, setLoadingFollowUp] = useState(false)
  const chatEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [employeeMessage, setEmployeeMessage] = useState("")
  const [replyInfo, setReplyInfo] = useState("")
  const [forwardTo, setForwardTo] = useState(clientEmail) // default to client, but editable
  const [loadingChat, setLoadingChat] = useState(false) // ✅ add this
  const [ccList, setCcList] = useState([])
  const [replyAllSourceMsg, setReplyAllSourceMsg] = useState(null)
  const [participants, setParticipants] = useState([])
  const [accounts, setAccounts] = useState([]) // Declare accounts state

  // starts with ONE CC input

  // reply | forward | null
  const [composeMode, setComposeMode] = useState(null)
  // visible "From" field in composer
  const [fromEmail, setFromEmail] = useState("")
  const [showEditWindow, setShowEditWindow] = useState(false)
  const [editForm, setEditForm] = useState({
    email: clientEmail || "",
    subject: "",
    body: "",
    leadStatus: "",
    result: "pending",
  })

  const addCCField = () => {
    setCcList([...ccList, ""])
  }

  const updateCC = (index, value) => {
    const updated = [...ccList]
    updated[index] = value
    setCcList(updated)
  }

  const removeCC = (index) => {
    if (ccList.length === 1) return // keep at least one
    setCcList(ccList.filter((_, i) => i !== index))
  }

  // Deduplicate messages by id + sentAt (stable)
  function uniqueMessages(list) {
    const seen = new Set()
    const out = []
    for (const m of list) {
      const key = `${m.id ?? ""}-${m.sentAt ?? ""}`
      if (!seen.has(key)) {
        seen.add(key)
        out.push(m)
      }
    }
    return out
  }

  // 🔥 Realtime incoming message injection
  useEffect(() => {
    const socket = getSocket()
    // Changed dependency to include selectedAccount.id explicitly to resolve lint warning
    if (!socket || !selectedAccount || !clientEmail) return

    const handleIncoming = (data) => {
      // Must belong to this account
      if (data.accountId !== selectedAccount.id) return

      // Identify participant email
      const participant =
        data.fromEmail?.toLowerCase() === selectedAccount.email?.toLowerCase()
          ? data.toEmail?.toLowerCase()
          : data.fromEmail?.toLowerCase()

      if (!participant) return

      // Must belong to this open chat
      if (participant !== clientEmail.toLowerCase()) return

      console.log("🟢 [RT][ChatView] New incoming message for this chat:", data)

      // Minimal new message object (backend gives full DB data if needed)
      const newMsg = {
        id: data.messageId || `temp-${Date.now()}`,
        fromEmail: data.fromEmail,
        toEmail: data.toEmail,
        subject: data.subject,
        body: data.snippet || "(No body)",
        sentAt: data.sentAt,
        direction: data.direction || "received",
        attachments: data.attachments || [],
      }

      // Insert message live
      setMessages((prev) => {
        const merged = [...prev, newMsg]
        const deduped = uniqueMessages(merged)
        deduped.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
        return deduped
      })

      // Auto scroll to bottom
      // setTimeout(() => {
      //   if (chatEndRef?.current) {
      //     chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      //   }
      // }, 150);
    }

    socket.on("new_email", handleIncoming)

    // Removed clientEmail from dependency array as it's not directly used within the effect's logic
    // and can lead to unnecessary re-subscriptions if only selectedAccount changes.
    return () => {
      socket.off("new_email", handleIncoming)
    }
  }, [selectedAccount?.id, clientEmail, setMessages, selectedAccount]) // Added selectedAccount to dependency array

  // useEffect(() => {
  //   chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages]);

  useEffect(() => {
    if (selectedAccount && clientEmail) {
      // ✅ Clear old chat UI
      setMessages([])
      setLoadingChat(true)

      // ✅ Close any open reply/forward composer
      setIsComposerOpen(false)
      setReplyInfo("")
      setSubject("")
      setConversationSubject("")
      setEmployeeMessage("")
      setAttachments([])

      // ✅ Fetch new chat
      fetchConversation()
      fetchFollowUpInfo()
    }
  }, [selectedAccount, clientEmail])

  useEffect(() => {
    const markUnreadMessages = async () => {
      if (!messages.length) return

      const unreadMessages = messages.filter((m) => !m.isRead && m.fromEmail !== selectedAccount.email)

      for (const msg of unreadMessages) {
        try {
          await api.patch(`/api/inbox/mark-read/${msg.id}`)
          window.dispatchEvent(
            new CustomEvent("updateUnreadCount", {
              detail: {
                accountId: selectedAccount.id,
                unreadCount: Math.max(0, (selectedAccount.unreadCount || 1) - unreadMessages.length),
                hasUnread: (selectedAccount.unreadCount || 1) - unreadMessages.length > 0,
              },
            }),
          )
        } catch (err) {
          console.error(`❌ Failed to mark message ${msg.id} as read:`, err)
        }
      }
    }

    markUnreadMessages()
  }, [messages, selectedAccount])
  useEffect(() => {
    if (!loadingChat && lastMessageRef.current && scrollRef.current) {
      const last = lastMessageRef.current

      const container = scrollRef.current

      // Scroll so that LAST message starts at the TOP of the container
      container.scrollTo({
        top: last.offsetTop,
        behavior: "auto",
      })
    }
  }, [loadingChat, messages])

  useEffect(() => {
    if (!isComposerOpen || !editorRef.current) return
    const editor = editorRef.current

    editor.innerHTML = "" // clear first

    const typingDiv = document.createElement("div")
    typingDiv.className = "compose-spacer"
    typingDiv.contentEditable = "true"
    typingDiv.innerHTML = "<br>"
    editor.appendChild(typingDiv)

    if (replyInfo) {
      const quoteDiv = document.createElement("div")
      quoteDiv.className = "quoted-content"
      quoteDiv.innerHTML = replyInfo
      quoteDiv.style.marginTop = "12px"
      editor.appendChild(quoteDiv)
    }

    const sel = window.getSelection()
    const range = document.createRange()
    range.setStart(typingDiv, 0)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    editor.focus()
  }, [isComposerOpen, replyInfo])
  useEffect(() => {
    if (!messages.length || !selectedAccount) return

    const myEmail = selectedAccount.email.toLowerCase()
    const setList = new Set()

    messages.forEach((msg) => {
      // FROM
      if (msg.fromEmail && msg.fromEmail.toLowerCase() !== myEmail) {
        setList.add(msg.fromEmail.toLowerCase())
      }

      // TO
      if (msg.toEmail) {
        msg.toEmail
          .split(/[;,]/)
          .map((e) => e.trim().toLowerCase())
          .forEach((e) => {
            if (e && e !== myEmail) setList.add(e)
          })
      }

      // CC
      if (msg.ccEmail) {
        msg.ccEmail
          .split(/[;,]/)
          .map((e) => e.trim().toLowerCase())
          .forEach((e) => {
            if (e && e !== myEmail) setList.add(e)
          })
      }
    })

    setParticipants([...setList]) // Final unique list
  }, [messages, selectedAccount])

  // 🔥 FILTER MESSAGES BASED ON TAB
  const displayedMessages = messages.filter((msg) => {
    // 1. Trash Tab
    if (selectedTab === "trash") {
      return msg.folder === "trash" || msg.isTrash
    }

    // 2. Spam Tab
    if (selectedTab === "spam") {
      return msg.folder === "spam" || msg.isSpam
    }

    // 3. Sent Tab: Only show Sent messages
    if (selectedTab === "sent") {
      return msg.direction === "sent" && !msg.isTrash && !msg.isSpam
    }

    // 4. Inbox Tab (Default): Show Inbox + Sent (Conversation View)
    // BUT hide Spam and Trash messages from the main inbox thread
    return !msg.isTrash && !msg.isSpam && msg.folder !== "trash" && msg.folder !== "spam"
  })

  const handleSaveEdit = async () => {
    if (!editForm.id) {
      alert("❌ Missing Lead ID — cannot update this record.")
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/update/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      const data = await res.json()
      if (data.success) {
        alert("✅ Lead updated successfully!")
        setShowEditWindow(false)
        fetchFollowUpInfo() // Refresh info in UI
      } else {
        alert("❌ Update failed: " + (data.message || "Unknown error"))
      }
    } catch (error) {
      console.error("Error updating lead:", error)
      alert("❌ Server error while updating lead.")
    }
  }

  useEffect(() => {
    if (!isComposerOpen || !editorRef.current) return
    const editor = editorRef.current

    editor.innerHTML = "" // clear first

    // 🧩 Create typing area FIRST
    const typingDiv = document.createElement("div")
    typingDiv.className = "compose-spacer"
    typingDiv.contentEditable = "true"
    typingDiv.innerHTML = "<br>"
    editor.appendChild(typingDiv)

    // 🧩 Then add quoted history BELOW
    if (replyInfo) {
      const quoteDiv = document.createElement("div")
      quoteDiv.className = "quoted-content"
      quoteDiv.innerHTML = replyInfo
      quoteDiv.style.marginTop = "12px"
      editor.appendChild(quoteDiv)
    }

    // Place cursor in the typing area
    const sel = window.getSelection()
    const range = document.createRange()
    range.setStart(typingDiv, 0)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    editor.focus()
  }, [isComposerOpen, replyInfo])

  const fetchConversation = async () => {
    try {
      const res = await api.get(`${API_BASE_URL}/api/inbox/conversation/${clientEmail}?mode=thread`, {
        params: { emailAccountId: selectedAccount.id },
      })

      const fixed = (res.data.data || []).map((msg) => ({
        ...msg,
        // 💡 FIX: Capture CC from different fields (cc, ccEmail, etc.)
        // and ensure array of emails is joined into a comma-separated string for easy parsing later.
        ccEmail: Array.isArray(msg.cc) ? msg.cc.join(", ") : msg.ccEmail || msg.cc || msg.ccEmails || msg.ccList || "",

        attachments: (msg.attachments || []).map((att) => ({
          id: att.id,
          filename: att.filename || "file",
          mimeType: att.mimeType || "application/octet-stream",
          url: att.url || att.storageUrl || att.path || null,
        })),
        body: (msg.body || "").replace(/src="\/uploads/g, `src='${API_BASE_URL}/uploads'`),
      }))

      const deduped = uniqueMessages(fixed)
      deduped.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))

      // Set conversation subject from the first message
      if (deduped.length > 0) {
        setConversationSubject(deduped[0].subject || "No Subject")
      }

      setMessages(deduped)
      setLoadingChat(false)
    } catch (err) {
      console.error("❌ Failed to load conversation:", err)
    }
  }
  const fetchFollowUpInfo = async () => {
    setLoadingFollowUp(true)
    try {
      const res = await api.get(`${API_BASE_URL}/api/leads/followups`, {
        params: { email: clientEmail },
      })

      if (res.data.success && res.data.data.length > 0) {
        setFollowUpInfo(res.data.data[0])
      } else {
        console.log("No follow-up info found for this email.")
        setFollowUpInfo(null)
      }
    } catch (err) {
      console.error("❌ Failed to fetch follow-up info:", err)
    } finally {
      setLoadingFollowUp(false)
    }
  }

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const formData = new FormData()
    files.forEach((f) => formData.append("files", f))
    try {
      const res = await fetch(`${API_BASE_URL}/api/uploads/upload`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.success) setAttachments((prev) => [...prev, ...data.files])
    } catch (err) {
      console.error("❌ Upload failed:", err)
    }
  }
  //--- New function to handle edit form changes ---
  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  // In ChatView.jsx, replace the existing handleReply function with this one:

  const handleReply = async () => {
    if (composeMode !== "forward" && !employeeMessage.trim()) {
      alert("Please type a message before sending.")
      return
    }

    const resolvedFrom = fromEmail.trim() || selectedAccount?.email || ""
    const resolvedTo = forwardTo.trim()

    if (!resolvedFrom) {
      alert("Please choose a From email.")
      return
    }
    if (!resolvedTo) {
      alert("Please enter a To email.")
      return
    }

    setReplying(true)
    try {
      const editorHTML = editorRef.current?.innerHTML || ""
      const fullBody = `
      <div style="font-family:Calibri, sans-serif;font-size:14px;line-height:1.6;color:#1f1f1f;">
        ${editorHTML}
      </div>
    `

      // ---------------------------------------
      // 🔥 CASE 1 — REPLY ALL (USE NEW BACKEND)
      // ---------------------------------------
      if (composeMode === "reply-all") {
        if (!replyAllSourceMsg) {
          alert("Missing reply source message.")
          return
        }

        const payload = {
          emailAccountId: selectedAccount.id,
          replyToId: replyAllSourceMsg.id,
          fromEmail: resolvedFrom,
          body: fullBody,
          attachments,
        }

        const res = await fetch(`${API_BASE_URL}/api/inbox/reply-all`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const data = await res.json()
        if (!data.success) {
          alert("Reply-All failed: " + data.message)
        }

        await fetchConversation()
        setIsComposerOpen(false)
        setComposeMode(null)
        setReplyAllSourceMsg(null)
        setAttachments([])
        setReplyInfo("")
        return
      }

      // ---------------------------------------
      // 🔵 CASE 2 — NORMAL REPLY / NEW MESSAGE / FORWARD
      // ---------------------------------------
      const payload = {
        emailAccountId: selectedAccount.id,
        from: resolvedFrom,
        to: resolvedTo,
        cc: ccList.filter((c) => c.trim() !== "").join(","),
        subject: subject.trim(),
        body: fullBody,
        attachments,
      }

      const res = await fetch(`${API_BASE_URL}/api/smtp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!data.success) {
        alert("Failed to send: " + data.message)
        return
      }

      // Reset UI
      setSubject("")
      setEmployeeMessage("")
      setReplyInfo("")
      setAttachments([])
      setIsComposerOpen(false)
      setComposeMode(null)
      setFromEmail("")

      await fetchConversation()
    } catch (err) {
      console.error("Reply Error:", err)
      alert("Reply failed")
    } finally {
      setReplying(false)
    }
  }

  const handleReplyToMessage = (msg) => {
    // 🧠 Build quoted reply block
    const quoted = `
    <div style="margin-top:10px;padding-left:10px;border-left:3px solid #dadce0;color:#202124;font-size:14px;line-height:1.5;">
      <div style="margin-bottom:6px;">
        <b>On ${new Date(msg.sentAt).toLocaleString()}</b>
        <a href="mailto:${msg.fromEmail}" style="color:#1a73e8;text-decoration:none;">${msg.fromEmail}</a> wrote:
      </div>
      <div>${msg.body}</div>
    </div>
  `

    // 🧩 Auto-fill fields — no user input required
    setComposeMode("reply") // mark reply mode
    setFromEmail(selectedAccount?.email || "") // from = connected account
    setForwardTo(msg.fromEmail || "") // to = sender
    setCcList(msg.ccEmail ? msg.ccEmail.split(",").map((c) => c.trim()) : [])
    setSubject(msg.subject?.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`)
    setReplyInfo(quoted)
    setIsComposerOpen(true)
  }

  // const handleReplyAll = (msg) => {
  //   const myEmail = selectedAccount.email.toLowerCase()

  //   // Always send TO the sender of selected message
  //   const toEmail = msg.fromEmail.toLowerCase()

  //   // CC should include ALL conversation participants except main TO
  //   const ccEmails = participants.filter((email) => email !== toEmail && email !== myEmail)

  //   // Build UI
  //   setComposeMode("reply-all")
  //   setReplyAllSourceMsg(msg)
  //   setFromEmail(selectedAccount.email)
  //   setForwardTo(msg.fromEmail)
  //   setCcList(ccEmails.length > 0 ? ccEmails : [""])
  //   setSubject(msg.subject?.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`)

  //   // quoted message
  //   const quoted = `
  //   <div style="margin-top:10px;padding-left:10px;border-left:3px solid #dadce0;">
  //     <b>On ${new Date(msg.sentAt).toLocaleString()}</b>
  //     <a href="mailto:${msg.fromEmail}">${msg.fromEmail}</a> wrote:
  //     <div>${msg.body}</div>
  //   </div>
  // `
  //   setReplyInfo(quoted)
  //   setIsComposerOpen(true)
  // }
const handleReplyAll = (msg) => {
  const myEmail = selectedAccount.email.toLowerCase();

  let toEmail = "";
  let ccEmails = [];

  // 🔑 CASE 1: RECEIVED MESSAGE
  if (msg.direction === "received") {
    // Reply-All → TO = sender
    toEmail = msg.fromEmail.toLowerCase();

    // CC = everyone except sender & me
    ccEmails = participants.filter(
      (email) =>
        email.toLowerCase() !== toEmail && email.toLowerCase() !== myEmail
    );
  }

  // 🔑 CASE 2: SENT MESSAGE
  else if (msg.direction === "sent") {
    // Reply-All → TO = original recipient(s)
    toEmail = msg.toEmail.toLowerCase();

    // CC = original CC list (exclude me if present)
    if (msg.ccEmail) {
      ccEmails = msg.ccEmail
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter((email) => email !== myEmail);
    }
  }

  // ---------------- UI SETUP ----------------
  setComposeMode("reply-all");
  setReplyAllSourceMsg(msg);
  setFromEmail(selectedAccount.email);
  setForwardTo(toEmail);
  setCcList(ccEmails.length > 0 ? ccEmails : [""]);

  setSubject(
    msg.subject?.toLowerCase().startsWith("re:")
      ? msg.subject
      : `Re: ${msg.subject}`
  );

  // ---------------- QUOTED MESSAGE ----------------
  const quoted = `
    <div style="margin-top:12px;padding-left:12px;border-left:3px solid #dadce0;">
      <div style="font-size:12px;color:#555;margin-bottom:6px;">
        On ${new Date(msg.sentAt).toLocaleString()},
        <a href="mailto:${msg.fromEmail}">${msg.fromEmail}</a> wrote:
      </div>
      <div>${msg.body}</div>
    </div>
  `;

  setReplyInfo(quoted);
  setIsComposerOpen(true);
};

  const handleForwardMessage = (msg) => {
    // 🧠 Build forwarded message block
    const forwarded = `
  <div style="font-family:Arial, sans-serif; font-size:14px; color:#202124;">
    <div style="margin-top:10px; margin-bottom:10px;">
      ---------- Forwarded message ---------<br>
      <b>From:</b> ${msg.fromEmail}<br>
      <b>Date:</b> ${new Date(msg.sentAt).toLocaleString()}<br>
      ${msg.subject ? `<b>Subject:</b> ${msg.subject}<br>` : ""}
      <b>To:</b> ${msg.toEmail}<br>
    </div>

    <div style="margin-top:10px;">
      ${msg.body}
    </div>
  </div>
`

    // 🧩 Prefill fields
    setComposeMode("forward") // set mode
    setFromEmail(selectedAccount?.email || "") // current connected account
    setForwardTo("") // <-- ALWAYS EMPTY FOR FORWARD
    // employee enters manually
    const newSubject =
      msg.subject && msg.subject.trim() !== ""
        ? msg.subject.startsWith("Fwd:")
          ? msg.subject
          : `Fwd: ${msg.subject}`
        : "Fwd: (No Subject)"

    setSubject(newSubject)

    setReplyInfo(forwarded)
    setAttachments(msg.attachments || []) // include original attachments
    setIsComposerOpen(true)
  }

  const loadUnreadCounts = async () => {
    try {
      const updated = await Promise.all(
        accounts.map(async (acc) => {
          const res = await api.get(`${API_BASE_URL}/api/inbox/accounts/${acc.id}/unread`)
          const unreadData = res.data?.data || {}
          return { ...acc, ...unreadData }
        }),
      )
      setAccounts(updated)
    } catch (err) {
      console.error("Failed to refresh unread counts:", err)
    }
  }

  const isImage = (fileName = "", mimeType = "") => {
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName) || /^image\//i.test(mimeType)
  }

  const imageAttachments = messages.flatMap((msg) => msg.attachments || []).filter((att) => isImage(att.filename))

  const openViewer = (fileName) => {
    const index = imageAttachments.findIndex((img) => img.filename === fileName)
    if (index >= 0) {
      setViewerIndex(index)
      setViewerOpen(true)
    }
  }

  const nextImage = () => setViewerIndex((prev) => (prev + 1) % imageAttachments.length)
  const prevImage = () => setViewerIndex((prev) => (prev === 0 ? imageAttachments.length - 1 : prev - 1))

  const renderAttachment = (att) => {
    if (!att) return null

    const fileUrl =
      att.url ||
      (att.id
        ? `${API_BASE_URL}/api/attachments/${att.id}`
        : att.storageUrl
          ? `${API_BASE_URL}${att.storageUrl}`
          : att.path
            ? `${API_BASE_URL}/${att.path}`
            : att.filename
              ? `${API_BASE_URL}/uploads/${att.filename}`
              : att instanceof File
                ? URL.createObjectURL(att)
                : "")

    const filename = att.filename || att.name || "file"
    const mimeType = att.mimeType || ""

    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename) || /^image\//i.test(att.mimeType)
    const isPDF = /\.pdf$/i.test(filename)
    const isHTML = /\.html?$/i.test(filename)
    const isWord = /\.(doc|docx)$/i.test(filename)
    const isExcel = /\.(xls|xlsx)$/i.test(filename)

    if (isImage) {
      return (
        <div
          key={att.id || filename}
          className="relative w-44 h-44 rounded-xl overflow-hidden border border-gray-200 shadow hover:scale-105 transition-transform cursor-pointer bg-gray-50"
          onClick={() => openViewer(filename)}
        >
          <img src={fileUrl || "/placeholder.svg"} alt={filename} className="object-cover w-full h-full" />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center transition">
            <ImageIcon className="w-6 h-6 text-white opacity-0 hover:opacity-100" />
          </div>
        </div>
      )
    }

    if (isPDF) {
      return (
        <div
          key={att.id || filename}
          onClick={() => window.open(fileUrl, "_blank")}
          className="flex flex-col items-center justify-center w-40 h-40 border border-gray-200 rounded-xl bg-gradient-to-br from-red-50 to-pink-50 hover:shadow-lg transition-all cursor-pointer"
        >
          <FileText className="w-8 h-8 text-red-600" />
          <span className="text-xs text-center mt-2 px-2 truncate">{filename}</span>
        </div>
      )
    }

    if (isWord) {
      return (
        <a
          key={att.id || filename}
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center w-40 h-40 border border-gray-200 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-all cursor-pointer"
        >
          <FileText className="w-8 h-8 text-blue-600" />
          <span className="text-xs text-center mt-2 px-2 truncate">{filename}</span>
        </a>
      )
    }

    if (isExcel) {
      return (
        <a
          key={att.id || filename}
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center w-40 h-40 border border-gray-200 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-all cursor-pointer"
        >
          <FileText className="w-8 h-8 text-green-600" />
          <span className="text-xs text-center mt-2 px-2 truncate">{filename}</span>
        </a>
      )
    }

    if (isHTML) {
      return (
        <div
          key={att.id || filename}
          onClick={() => window.open(fileUrl, "_blank")}
          className="flex flex-col items-center justify-center w-40 h-40 border border-gray-200 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 hover:shadow-lg transition-all cursor-pointer"
        >
          <FileText className="w-8 h-8 text-yellow-600" />
          <span className="text-xs text-center mt-2 px-2 truncate">{filename}</span>
        </div>
      )
    }

    return (
      <a
        key={att.id || filename}
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:shadow transition"
      >
        <Paperclip className="w-4 h-4" />
        <span className="truncate">{filename}</span>
      </a>
    )
  }

  // ✅ Mark a single message as read
  const handleMessageClick = async (message) => {
    try {
      if (message.isRead) return // already marked

      await api.patch(`/api/inbox/mark-read/${message.id}`)

      setMessages((prev) => {
        const updatedMessages = prev.map((m) => (m.id === message.id ? { ...m, isRead: true } : m))
        return updatedMessages
      })

      console.log(`✅ Marked message ${message.id} as read`)
    } catch (err) {
      console.error("❌ Failed to mark message as read:", err)
    }
  }

  const formatMessageTime = (date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50/30 via-green-50/20 to-emerald-50/30">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/60 bg-white shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {clientEmail.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-sm">{clientEmail.split("@")[0]}</div>
            <div className="text-xs text-black-500 font-semibold">{clientEmail}</div>
          </div>
        </div>

        {/* Subject Header */}
        <div className="flex items-center gap-4 ">
          <div className="mr-5">
            {conversationSubject && (
              <div className="px-5 py-3 mr-0 ml-auto  bg-white">
                <h2 className="text-lg font-semibold text-gray-800 truncate">Subject: {conversationSubject}</h2>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Schedule + Edit Buttons */}
            <div className="flex items-center gap-2">
              {/* ➕ Schedule Button */}
              <button
                onClick={() => setShowScheduleModal(true)}
                className="p-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg"
                title="Schedule Email"
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* ✏️ Edit Button */}
              <button
                onClick={() => {
                  if (!followUpInfo) {
                    alert("No lead record found for this client email.")
                    return
                  }
                  setEditForm({
                    id: followUpInfo.id, // ✅ Needed for update PUT /api/leads/:id
                    client: followUpInfo.client || "",
                    email: followUpInfo.email || clientEmail || "",
                    cc: followUpInfo.cc || "",
                    phone: followUpInfo.phone || "",
                    subject: followUpInfo.subject || "",
                    body: followUpInfo.body || "",
                    response: followUpInfo.response || "",
                    leadStatus: followUpInfo.leadStatus || "",
                    salesperson: followUpInfo.salesperson || "",
                    brand: followUpInfo.brand || "",
                    companyName: followUpInfo.companyName || "",
                    dealValue: followUpInfo.dealValue || "",
                    result: followUpInfo.result || "pending",
                    day: followUpInfo.day || "",
                    followUpDate: followUpInfo.followUpDate
                      ? new Date(followUpInfo.followUpDate).toISOString().split("T")[0]
                      : "",
                  })

                  setShowEditWindow(true)
                }}
                className="p-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg"
                title="Edit Follow-up"
              >
                ✏️
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Header */}
      {/* {conversationSubject && (
        <div className="px-5 py-3 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-800 truncate">
            {conversationSubject}
          </h2>
        </div>
      )} */}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
        {/* 🔥 NEW: Filter messages based on selectedTab */}
        {messages
          .filter((msg) => {
            // 1. Trash Tab: Show EVERYTHING for context
            if (selectedTab === "trash") {
              return true
            }

            // 2. Spam Tab: Show EVERYTHING for context
            // The server already filtered the CONVERSATION LIST; the thread view should show all messages in the thread.
            if (selectedTab === "spam") {
              return true
            }

            // 3. Sent Tab: Only show Sent items in Sent view
            if (selectedTab === "sent") {
              return (
                msg.direction === "sent" &&
                !msg.isTrash &&
                !msg.isSpam &&
                msg.folder !== "trash" &&
                msg.folder !== "spam"
              )
            }

            // 4. Inbox Tab (Default): Show Received + Sent (Thread view)
            // BUT hide specific messages that belong in Trash or Spam
            const isTrashOrSpam = msg.isTrash || msg.isSpam || msg.folder === "trash" || msg.folder === "spam"

            return !isTrashOrSpam
          })
          .map((msg, idx, filteredList) => {
            const isMine = msg.fromEmail === selectedAccount.email

            // 1. Check if I sent this to someone OTHER than the main client (e.g. to the CC)
            const isSentToCC = isMine && msg.toEmail && msg.toEmail.toLowerCase() !== clientEmail.toLowerCase()

            // 2. Check if this is a received message from a CC (Third Party)
            const isCCSender = !isMine && msg.fromEmail.toLowerCase() !== clientEmail.toLowerCase()

            const showAvatar = idx === 0 || filteredList[idx - 1].fromEmail !== msg.fromEmail

            return (
              <motion.div
                key={`${msg.id}-${idx}`}
                ref={idx === filteredList.length - 1 ? lastMessageRef : null}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-3 max-w-2xl ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                  {/* AVATAR */}
                  {showAvatar && (
                    <div
                      className={`
                        w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-md flex-shrink-0
                        ${
                          isMine
                            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                            : isCCSender
                              ? "bg-gradient-to-br from-orange-500 to-red-500 text-white" // Orange Avatar for CC
                              : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700" // Gray/Green Avatar for Client
                        }
                      `}
                      title={isMine ? `To: ${msg.toEmail}` : `From: ${msg.fromEmail}`}
                    >
                      {msg.fromEmail.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {!showAvatar && <div className="w-10" />}

                  {/* MESSAGE BUBBLE */}
                  <div
                    onClick={() => handleMessageClick(msg)}
                    className={`
                      relative px-5 py-4 rounded-2xl shadow-md transition-all
                      ${
                        isMine
                          ? "bg-gradient-to-br from-blue-50 to-indigo-50 text-gray-800 border-2 border-blue-200 rounded-br-md" // 🔵 Unified Blue for Sent
                          : msg.isRead
                            ? "bg-gradient-to-br from-green-50 to-emerald-50 text-gray-800 border-2 border-green-200 rounded-bl-md opacity-90" // 🟢 Unified Green for Received
                            : "bg-gradient-to-br from-yellow-50 to-emerald-50 text-gray-800 border-2 border-yellow-300 rounded-bl-md"
                      }
                    `}
                  >
                    {/* 🔥 INCOMING HEADER (From Name) */}
                    {!isMine && (
                      <div className="mb-2 pb-1 border-b border-black/5 flex items-center justify-between gap-2">
                        <span className={`text-md font-semibold ${isCCSender ? "text-orange-700" : "text-green-700"}`}>
                          {msg.fromEmail.split("<")[0].replace(/"/g, "").trim()}
                        </span>
                        {isCCSender && (
                          <span className="text-[12px] font-medium text-orange-700 bg-white/60 px-1.5 py-0.5 rounded border border-orange-200">
                            CC Reply
                          </span>
                        )}
                      </div>
                    )}

                    {/* 🔥 OUTGOING HEADER (To Name - Only if sent to CC) */}
                    {isSentToCC && (
                      <div className="mb-2 pb-1 border-b border-purple-200 flex items-center justify-end gap-2">
                        <span className="text-[9px] font-medium text-purple-700 bg-white/60 px-1.5 py-0.5 rounded border border-purple-200">
                          To: {msg.toEmail.split("<")[0].replace(/"/g, "").trim()}
                        </span>
                      </div>
                    )}

                    {/* Unread Dot */}
                    {!isMine && !msg.isRead && (
                      <span className="absolute -left-3 top-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                    )}

                    {/* Body */}
                    <div
                      className="prose prose-sm max-w-none break-words"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          collapseQuotedContent(
                            (msg.body || "")
                              .replace(/src=["']cid:([^"']+)["']/g, `src='${API_BASE_URL}/api/attachments/cid-$1'`)
                              .replace(/src=["']\/uploads/g, `src='${API_BASE_URL}/uploads`),
                          ),
                        ),
                      }}
                    />

                    {/* Attachments */}
                    {msg.attachments?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-3 pt-2 border-t border-black/5">
                        {msg.attachments.map((att, ai) => {
                          const url =
                            att.url ||
                            (att.id
                              ? `${API_BASE_URL}/api/attachments/${att.id}`
                              : `${API_BASE_URL}/uploads/${att.filename}`)
                          return (
                            <a
                              key={ai}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 underline flex items-center gap-1"
                            >
                              <Paperclip className="w-3 h-3" /> {att.filename}
                            </a>
                          )
                        })}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-2 mt-2 pt-1 justify-end">
                      <span
                        className={`text-[10px] font-medium ${
                          isMine
                            ? isSentToCC
                              ? "text-purple-600"
                              : "text-blue-600"
                            : isCCSender
                              ? "text-orange-600"
                              : "text-green-600"
                        }`}
                      >
                        {formatMessageTime(msg.sentAt)}
                      </span>
                      {isMine && (
                        <CheckCheck className={`w-3.5 h-3.5 ${isSentToCC ? "text-purple-600" : "text-blue-600"}`} />
                      )}
                    </div>

                    {/* Actions */}
                    {!isComposerOpen && (
                      <div className="flex gap-3 mt-2 text-xs border-t border-black/5 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReplyToMessage(msg)
                          }}
                          className="text-blue-600 font-semibold flex gap-1"
                        >
                          <Send className="w-3 h-3" /> Reply
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReplyAll(msg)
                          }}
                          className="text-green-600 font-semibold flex gap-1"
                        >
                          <Send className="w-3 h-3" /> Reply All
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleForwardMessage(msg)
                          }}
                          className="text-gray-600 font-semibold flex gap-1"
                        >
                          <FileText className="w-3 h-3" /> Forward
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        <div ref={chatEndRef} />
      </div>

      {/* Image viewer */}
      {viewerOpen && (
        <ImageViewer
          images={messages.flatMap((m) => m.attachments || []).filter((att) => att.mimeType?.startsWith("image/"))}
          index={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}

      {/* Compose Area */}
      <div className="border-t border-gray-200 bg-white shadow-lg">
        {!isComposerOpen ? (
          <div className="p-4">
            <button
              // onClick={() => setIsComposerOpen(true)}
              onClick={() => {
                setComposeMode("new") // 🟢 mark as new compose
                setIsComposerOpen(true)
                setFromEmail(selectedAccount?.email || "") // ✅ auto-fill FROM
                setForwardTo(clientEmail || "") // ✅ auto-fill TO (client's email)
                setSubject("")
                setReplyInfo("")
                setEmployeeMessage("")
                setAttachments([])
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Reply to {clientEmail.split("@")[0]}
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col h-[calc(100vh-180px)] bg-gradient-to-br from-white to-gray-50 rounded-t-2xl shadow-inner"
          >
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
              {true && (
                <>
                  {/* FROM */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">From</label>
                    <input
                      type="email"
                      placeholder="Enter sender email..."
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                    />
                  </div>

                  {/* TO */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">To</label>
                    <input
                      type="email"
                      placeholder="Enter recipient email..."
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                    />
                  </div>

                  {/* CC (Multiple Allowed) */}
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">CC (Optional)</label>

                    {ccList.map((cc, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <input
                          type="email"
                          placeholder="cc@example.com"
                          value={cc}
                          onChange={(e) => updateCC(index, e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        />

                        {ccList.length > 1 && (
                          <button onClick={() => removeCC(index)} className="text-red-500 hover:text-red-700 font-bold">
                            ✕
                          </button>
                        )}
                      </div>
                    ))}

                    <button onClick={addCCField} className="mt-1 text-blue-600 text-sm font-semibold hover:underline">
                      + Add another CC
                    </button>
                  </div>
                </>
              )}

              {/* Subject */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Subject</label>
                <input
                  type="text"
                  placeholder="Enter email subject..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Message</label>

                <div
                  ref={editorRef} // << attach the ref
                  contentEditable
                  suppressContentEditableWarning
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all overflow-y-auto"
                  data-placeholder="Type your message here..." // we use CSS :before to show placeholder
                  onInput={(e) => setEmployeeMessage(e.currentTarget.innerHTML)} // keep state in sync
                />
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-700">
                      {attachments.length} File
                      {attachments.length > 1 ? "s" : ""} Attached
                    </span>
                    <button
                      onClick={() => setAttachments([])}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white border border-blue-200 rounded-lg p-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                          {file.type?.startsWith("image/") ? (
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-indigo-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed bottom toolbar */}
            <div className="border-t bg-white px-5 py-3 flex items-center justify-between sticky bottom-0">
              <div className="flex items-center gap-2">
                <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <Paperclip className="w-4 h-4" />
                  Attach
                </button>
                <button
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>

              <button
                onClick={handleReply}
                disabled={replying}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                {replying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          account={selectedAccount}
          composeData={{
            from: selectedAccount.email,
            to: clientEmail,
            subject: subject || `Follow-up with ${clientEmail.split("@")[0]}`,
            body: replyBody || "",
            clientResponse: messages[messages.length - 1]?.body || "",
          }}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
        .prose p {
          margin: 0.5em 0;
        }
        .prose a {
          color: inherit;
          text-decoration: underline;
        }

        [contenteditable="true"]:empty:before {
          content: attr(placeholder);
          color: #9ca3af;
        }

        details summary::-webkit-details-marker {
    display: none;
  }
  details summary {
    user-select: none;
    cursor: pointer;
  }
  details[open] summary {
    color: #1a73e8;
  }
      `}</style>
      {/* Floating Edit Window inside Inbox */}
      {showEditWindow && (
        <div style={{ zIndex: 9997 }}>
          <FollowUpEditModal
            editForm={editForm}
            onChange={(field, val) => setEditForm((prev) => ({ ...prev, [field]: val }))}
            onSave={handleSaveEdit}
            onClose={() => setShowEditWindow(false)}
          />
        </div>
      )}
    </div>
  )
}
