// src/pages/components/inbox/MessageList.jsx
import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Mail,
  Calendar,
  ExternalLink,
  Download,
  Paperclip,
  Send,
  Reply,
  Clock,
  Filter,
  ChevronDown,
  Search,
  X,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function MessageList({
  followUps,
  messages,
  selectedAccount,
  onBack,
  setComposeData,
  showScheduleModal,
  fetchMessages,
}) {
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState([]);

  const filterOptions = [
    { value: "all", label: "All Messages", icon: Mail },
    { value: "today", label: "Today", icon: Calendar },
    { value: "yesterday", label: "Yesterday", icon: Calendar },
    { value: "3days", label: "Last 3 Days", icon: Calendar },
    { value: "7days", label: "Last 7 Days", icon: Calendar },
    { value: "30days", label: "Last 30 Days", icon: Calendar },
    { value: "3months", label: "Last 3 Months", icon: Calendar },
  ];

  // 🔥 FILTER + SEARCH
  const filteredMessages = useMemo(() => {
    let filtered = messages;

    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      filtered = filtered.filter((msg) => {
        const msgDate = new Date(msg.sentAt);
        const msgDay = new Date(
          msgDate.getFullYear(),
          msgDate.getMonth(),
          msgDate.getDate()
        );

        switch (dateFilter) {
          case "today":
            return msgDay.getTime() === today.getTime();
          case "yesterday":
            return msgDay.getTime() === yesterday.getTime();
          case "3days":
            return msgDate >= new Date(today.setDate(today.getDate() - 3));
          case "7days":
            return msgDate >= new Date(today.setDate(today.getDate() - 7));
          case "30days":
            return msgDate >= new Date(today.setDate(today.getDate() - 30));
          case "3months":
            return msgDate >= new Date(today.setMonth(today.getMonth() - 3));
          default:
            return true;
        }
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((msg) => {
        return (
          (msg.fromEmail || "").toLowerCase().includes(q) ||
          (msg.toEmail || "").toLowerCase().includes(q) ||
          (msg.ccEmail || "").toLowerCase().includes(q) ||
          (msg.subject || "").toLowerCase().includes(q) ||
          (msg.body || "")
            .replace(/<[^>]*>/g, "")
            .toLowerCase()
            .includes(q) ||
          new Date(msg.sentAt).toLocaleDateString().toLowerCase().includes(q)
        );
      });
    }

    return filtered;
  }, [messages, dateFilter, searchQuery]);

  // 🕒 Schedule
  const handleSchedule = (msg) => {
    const isClientReply = msg.direction === "received";
    const scheduleData = {
      from: isClientReply ? selectedAccount.email : msg.fromEmail,
      to: isClientReply ? msg.fromEmail : msg.toEmail,
      subject: msg.subject,
      body: `<p><br><br>---- Previous Message ----<br>${msg.body}</p>`,
      clientResponse: msg.body,
    };
    showScheduleModal(scheduleData);
  };

  // 🔥 SEND REPLY
  const handleReply = async (msg) => {
    if (!replyBody.trim()) return;

    setReplying(true);
    try {
      const payload = {
        emailAccountId: selectedAccount.id,
        replyToId: msg.id,
        fromEmail: selectedAccount.email,
        subject: msg.subject,
        body: replyBody,
        attachments: replyAttachments.map((a) => ({
          name: a.name,
          filename: a.filename,
          url: a.url,
          type: a.mimeType,
        })),
      };

      const res = await fetch(`${API_BASE_URL}/api/inbox/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert("Reply Sent");
        setReplyBody("");
        setReplyAttachments([]);
        fetchMessages(selectedAccount.id, "inbox");
      }
    } catch (err) {
      alert("Reply failed");
    } finally {
      setReplying(false);
    }
  };

  // 📁 FILE UPLOAD
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch(`${API_BASE_URL}/api/uploads/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setReplyAttachments((prev) => [
          ...prev,
          ...data.files.map((f) => ({
            name: f.filename,
            filename: f.filename,
            mimeType: f.mimeType,
            size: f.size,
            url: f.url.startsWith("http") ? f.url : `${API_BASE_URL}${f.url}`,
          })),
        ]);
      }
    } catch (err) {
      console.error("File upload failed", err);
    }
  };

  const getSelectedFilterLabel = () =>
    filterOptions.find((opt) => opt.value === dateFilter)?.label ||
    "All Messages";

  const clearSearch = () => setSearchQuery("");

  // ==========================
  // 📬 MESSAGE LIST VIEW
  // ==========================
  if (!selectedMsg) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-white to-gray-50/50">
        <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 bg-white sticky top-0 z-20 shadow-sm">
          <div className="space-y-4">
            {/* HEADER */}
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="hidden sm:inline">Messages</span>
                <span className="sm:hidden">Inbox</span>
                <span className="text-xs sm:text-sm px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {filteredMessages.length}
                </span>
              </h2>

              {/* Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-xl"
                >
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span className="text-sm hidden sm:inline">
                    {getSelectedFilterLabel()}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 ${showFilterMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {showFilterMenu && (
                  <>
                    <div
                      className="fixed inset-0"
                      onClick={() => setShowFilterMenu(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border">
                      {filterOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            onClick={() => {
                              setDateFilter(option.value);
                              setShowFilterMenu(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
                              dateFilter === option.value
                                ? "bg-blue-600 text-white"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* SEARCH */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email, subject..."
                className="w-full pl-12 pr-12 py-3 border-2 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              No messages found.
            </div>
          ) : (
            <div className="divide-y">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMsg(msg)}
                  className="cursor-pointer p-5 hover:bg-blue-50 border-l-4 border-transparent hover:border-blue-500"
                >
                  <div className="flex justify-between">
                    <div className="flex gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                          msg.direction === "received"
                            ? "bg-emerald-600"
                            : "bg-blue-600"
                        }`}
                      >
                        {msg.fromEmail[0].toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          {msg.direction === "received" ? (
                            <Reply className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Send className="w-3 h-3 text-blue-600" />
                          )}

                          <span className="font-semibold">{msg.fromEmail}</span>

                          {msg.ccEmail && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 rounded">
                              CC
                            </span>
                          )}
                        </div>

                        <p className="font-medium">
                          {msg.subject || "(No Subject)"}
                        </p>

                        <p className="text-gray-500 text-sm truncate">
                          {msg.body?.replace(/<[^>]*>/g, "")}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-500">
                      <div>
                        {new Date(msg.sentAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div>
                        {new Date(msg.sentAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================
  // 📥 MESSAGE DETAIL VIEW
  // ==========================
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b flex justify-between">
        <button
          onClick={() => setSelectedMsg(null)}
          className="flex gap-2 items-center"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <button
          onClick={() => handleSchedule(selectedMsg)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl"
        >
          <Calendar className="w-4 h-4" /> Schedule Follow-up
        </button>
      </div>

      {/* MESSAGE CONTENT */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border rounded-xl p-6 shadow-sm bg-white">
          <h2 className="text-xl font-bold">{selectedMsg.subject}</h2>

          <p className="mt-2 text-sm">
            <strong>From:</strong> {selectedMsg.fromEmail}
          </p>
          <p className="text-sm">
            <strong>To:</strong> {selectedMsg.toEmail}
          </p>
          {selectedMsg.ccEmail && (
            <p className="text-sm">
              <strong>CC:</strong> {selectedMsg.ccEmail}
            </p>
          )}

          <p className="text-xs mt-1 text-gray-500">
            <Clock className="w-3 h-3 inline" />{" "}
            {new Date(selectedMsg.sentAt).toLocaleString()}
          </p>

          <div
            className="prose mt-6"
            dangerouslySetInnerHTML={{
              __html: selectedMsg.body?.replace(
                /src=["']\/uploads\//g,
                `src='${API_BASE_URL}/uploads/`
              ),
            }}
          ></div>

          {/* ATTACHMENTS */}
          {/* ATTACHMENTS (UPDATED) */}
          {selectedMsg.attachments?.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-bold mb-3">
                Attachments ({selectedMsg.attachments.length})
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedMsg.attachments.map((file, i) => {
                  // Use backend-generated URL (sent attachments = R2, received = IMAP proxy)
                  const fileUrl = file.url.startsWith("http")
                    ? file.url
                    : `${API_BASE_URL}${file.url}`;

                  return (
                    <div
                      key={i}
                      className="p-3 border rounded-xl bg-gray-50 hover:border-blue-400"
                    >
                      <p className="truncate text-sm mb-2">{file.filename}</p>

                      <div className="flex gap-2">
                        {/* OPEN FILE */}
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-white border rounded text-xs flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </a>

                        {/* DOWNLOAD (IMAP or R2) */}
                        <a
                          href={file.url}
                          download
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REPLY SECTION */}
          <div className="mt-8 border-t pt-6">
            <h3 className="font-semibold mb-3">Reply</h3>

            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={4}
              className="w-full border rounded-xl p-3"
              placeholder="Write your reply..."
            />

            {replyAttachments.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {replyAttachments.map((f, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                  >
                    <Paperclip className="w-3 h-3 inline" /> {f.name}
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-4">
              <label className="flex items-center gap-2 cursor-pointer text-blue-600">
                <Paperclip className="w-4 h-4" /> Attach files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              <button
                onClick={() => handleReply(selectedMsg)}
                disabled={!replyBody.trim() || replying}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50"
              >
                {replying ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// // src/pages/components/inbox/MessageList.jsx
// import React, { useState, useMemo } from "react";
// import {
//   ArrowLeft,
//   Mail,
//   Calendar,
//   ExternalLink,
//   Download,
//   Paperclip,
//   Send,
//   Reply,
//   Clock,
//   Filter,
//   ChevronDown,
//   Search,
//   X,
// } from "lucide-react";
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// export default function MessageList({
//   followUps,
//   messages,
//   selectedAccount,
//   onBack,
//   setComposeData,
//   showScheduleModal,
//   fetchMessages,
// }) {
//   const [selectedMsg, setSelectedMsg] = useState(null);
//   const [dateFilter, setDateFilter] = useState("all");
//   const [showFilterMenu, setShowFilterMenu] = useState(false);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [replyBody, setReplyBody] = useState("");
//   const [replying, setReplying] = useState(false);
//   const [replyAttachments, setReplyAttachments] = useState([]); // uploaded files

//   // Date filter options
//   const filterOptions = [
//     { value: "all", label: "All Messages", icon: Mail },
//     { value: "today", label: "Today", icon: Calendar },
//     { value: "yesterday", label: "Yesterday", icon: Calendar },
//     { value: "3days", label: "Last 3 Days", icon: Calendar },
//     { value: "7days", label: "Last 7 Days", icon: Calendar },
//     { value: "30days", label: "Last 30 Days", icon: Calendar },
//     { value: "3months", label: "Last 3 Months", icon: Calendar },
//   ];

//   // Filter and search messages
//   const filteredMessages = useMemo(() => {
//     let filtered = messages;

//     // Apply date filter
//     if (dateFilter !== "all") {
//       const now = new Date();
//       const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//       const yesterday = new Date(today);
//       yesterday.setDate(yesterday.getDate() - 1);

//       filtered = filtered.filter((msg) => {
//         const msgDate = new Date(msg.date);
//         const msgDay = new Date(
//           msgDate.getFullYear(),
//           msgDate.getMonth(),
//           msgDate.getDate()
//         );

//         switch (dateFilter) {
//           case "today":
//             return msgDay.getTime() === today.getTime();

//           case "yesterday":
//             return msgDay.getTime() === yesterday.getTime();

//           case "3days":
//             const threeDaysAgo = new Date(today);
//             threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
//             return msgDate >= threeDaysAgo;

//           case "7days":
//             const sevenDaysAgo = new Date(today);
//             sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//             return msgDate >= sevenDaysAgo;

//           case "30days":
//             const thirtyDaysAgo = new Date(today);
//             thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//             return msgDate >= thirtyDaysAgo;

//           case "3months":
//             const threeMonthsAgo = new Date(today);
//             threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
//             return msgDate >= threeMonthsAgo;

//           default:
//             return true;
//         }
//       });
//     }

//     // Apply search filter
//     if (searchQuery.trim()) {
//       const query = searchQuery.toLowerCase();
//       filtered = filtered.filter((msg) => {
//         const fromEmail = (msg.fromEmail || "").toLowerCase();
//         const toEmail = (msg.toEmail || "").toLowerCase();
//         const ccEmail = (msg.cc || "").toLowerCase();
//         const subject = (msg.subject || "").toLowerCase();
//         const body = (msg.body || "").replace(/<[^>]*>/g, "").toLowerCase();
//         const date = new Date(msg.date).toLocaleDateString().toLowerCase();

//         return (
//           fromEmail.includes(query) ||
//           toEmail.includes(query) ||
//           ccEmail.includes(query) ||
//           subject.includes(query) ||
//           body.includes(query) ||
//           date.includes(query)
//         );
//       });
//     }

//     return filtered;
//   }, [messages, dateFilter, searchQuery]);

//   const handleSchedule = (msg) => {
//     const isClientReply = msg.direction === "received";
//     const scheduleData = {
//       from: isClientReply ? selectedAccount.email : msg.fromEmail,
//       to: isClientReply ? msg.fromEmail : msg.toEmail,
//       subject: msg.subject,
//       body: `<p><br><br>---- Previous Message ----<br>${msg.body}</p>`,
//       clientResponse: msg.body,
//     };

//     showScheduleModal(scheduleData);
//   };

//   // 🧠 Reply handler
//   const handleReply = async (msg) => {
//     if (!replyBody.trim()) return;
//     setReplying(true);
//     try {
//       const payload = {
//         emailAccountId: selectedAccount.id,
//         replyToId: msg.id,
//         fromEmail: selectedAccount.email,
//         subject: msg.subject,
//         body: replyBody,
//         attachments: replyAttachments, // ✅ include attachments
//       };

//       const res = await fetch(`${API_BASE_URL}/api/inbox/reply`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();
//       if (data.success) {
//         alert("✅ Reply sent successfully!");
//         setReplyBody("");
//         setReplyAttachments([]);
//         fetchMessages(selectedAccount.id, "inbox");
//       } else {
//         alert("❌ Failed to send reply");
//       }
//     } catch (err) {
//       console.error("❌ Reply error:", err);
//       alert("Reply failed");
//     } finally {
//       setReplying(false);
//     }
//   };

//   // 🧩 Handle file upload
//   const handleFileChange = async (e) => {
//     const files = Array.from(e.target.files);
//     if (files.length === 0) return;

//     const formData = new FormData();
//     files.forEach((f) => formData.append("files", f));

//     try {
//       const res = await fetch(`${API_BASE_URL}/api/uploads/upload`, {
//         method: "POST",
//         body: formData,
//       });
//       const data = await res.json();
//       if (data.success) {
//         setReplyAttachments((prev) => [...prev, ...data.files]);
//       }
//     } catch (err) {
//       console.error("❌ File upload failed:", err);
//     }
//   };

//   const getSelectedFilterLabel = () => {
//     return (
//       filterOptions.find((opt) => opt.value === dateFilter)?.label ||
//       "All Messages"
//     );
//   };

//   const clearSearch = () => {
//     setSearchQuery("");
//   };

//   if (!selectedMsg) {
//     return (
//       <div className="h-full flex flex-col bg-gradient-to-br from-white to-gray-50/50">
//         {/* Message List Header */}
//         <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 bg-white sticky top-0 z-20 shadow-sm">
//           <div className="space-y-4">
//             {/* Title and Stats */}
//             <div className="flex items-center justify-between">
//               <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
//                 <Mail className="w-5 h-5 text-blue-600" />
//                 <span className="hidden sm:inline">Messages</span>
//                 <span className="sm:hidden">Inbox</span>
//                 <span className="text-xs sm:text-sm font-normal px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
//                   {filteredMessages.length}
//                 </span>
//               </h2>

//               {/* Date Filter Dropdown */}
//               <div className="relative">
//                 <button
//                   onClick={() => setShowFilterMenu(!showFilterMenu)}
//                   className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all shadow-sm"
//                 >
//                   <Filter className="w-4 h-4 text-blue-600" />
//                   <span className="text-sm font-semibold text-gray-700 hidden sm:inline">
//                     {getSelectedFilterLabel()}
//                   </span>
//                   <ChevronDown
//                     className={`w-4 h-4 text-gray-600 transition-transform ${
//                       showFilterMenu ? "rotate-180" : ""
//                     }`}
//                   />
//                 </button>

//                 {/* Filter Dropdown Menu */}
//                 {showFilterMenu && (
//                   <>
//                     <div
//                       className="fixed inset-0 z-10"
//                       onClick={() => setShowFilterMenu(false)}
//                     />
//                     <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-20 overflow-hidden">
//                       {filterOptions.map((option) => {
//                         const Icon = option.icon;
//                         return (
//                           <button
//                             key={option.value}
//                             onClick={() => {
//                               setDateFilter(option.value);
//                               setShowFilterMenu(false);
//                             }}
//                             className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
//                               dateFilter === option.value
//                                 ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
//                                 : "hover:bg-gray-50 text-gray-700"
//                             }`}
//                           >
//                             <Icon className="w-4 h-4" />
//                             <span className="text-sm font-medium">
//                               {option.label}
//                             </span>
//                             {dateFilter === option.value && (
//                               <div className="ml-auto w-2 h-2 rounded-full bg-white"></div>
//                             )}
//                           </button>
//                         );
//                       })}
//                     </div>
//                   </>
//                 )}
//               </div>
//             </div>

//             {/* Search Bar */}
//             <div className="relative">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
//               <input
//                 type="text"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 placeholder="Search by email, subject, date, or content..."
//                 className="w-full pl-12 pr-12 py-3 bg-gradient-to-r from-gray-50 to-blue-50/30 border-2 border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm sm:text-base"
//               />
//               {searchQuery && (
//                 <button
//                   onClick={clearSearch}
//                   className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-lg transition-colors"
//                 >
//                   <X className="w-4 h-4 text-gray-500" />
//                 </button>
//               )}
//             </div>

//             {/* Active Filters Info */}
//             {(dateFilter !== "all" || searchQuery) && (
//               <div className="flex flex-wrap items-center gap-2">
//                 <span className="text-xs text-gray-500 font-medium">
//                   Active filters:
//                 </span>
//                 {dateFilter !== "all" && (
//                   <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
//                     <Calendar className="w-3 h-3" />
//                     {getSelectedFilterLabel()}
//                     <button
//                       onClick={() => setDateFilter("all")}
//                       className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
//                     >
//                       <X className="w-3 h-3" />
//                     </button>
//                   </span>
//                 )}
//                 {searchQuery && (
//                   <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
//                     <Search className="w-3 h-3" />
//                     Search: "{searchQuery.slice(0, 20)}
//                     {searchQuery.length > 20 ? "..." : ""}"
//                     <button
//                       onClick={clearSearch}
//                       className="ml-1 hover:bg-green-200 rounded-full p-0.5"
//                     >
//                       <X className="w-3 h-3" />
//                     </button>
//                   </span>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Messages List */}
//         <div className="flex-1 overflow-y-auto">
//           {filteredMessages.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4">
//               <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4 shadow-inner">
//                 {searchQuery || dateFilter !== "all" ? (
//                   <Search className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
//                 ) : (
//                   <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
//                 )}
//               </div>
//               <p className="text-sm sm:text-base text-gray-500 text-center font-semibold mb-1">
//                 {searchQuery || dateFilter !== "all"
//                   ? "No messages found"
//                   : "No messages"}
//               </p>
//               <p className="text-xs sm:text-sm text-gray-400 text-center">
//                 {searchQuery || dateFilter !== "all"
//                   ? "Try adjusting your filters or search query"
//                   : "Your inbox is empty"}
//               </p>
//             </div>
//           ) : (
//             <div className="divide-y divide-gray-100">
//               {filteredMessages.map((msg) => (
//                 <div
//                   key={msg.id}
//                   onClick={() => setSelectedMsg(msg)}
//                   className="cursor-pointer p-4 sm:p-5 lg:p-6 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all group border-l-4 border-transparent hover:border-blue-500"
//                 >
//                   <div className="flex items-start justify-between gap-3 sm:gap-4">
//                     <div className="flex items-start gap-3 flex-1 min-w-0">
//                       <div
//                         className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white shadow-md ${
//                           msg.direction === "received"
//                             ? "bg-gradient-to-br from-emerald-500 to-teal-600"
//                             : "bg-gradient-to-br from-blue-500 to-indigo-600"
//                         }`}
//                       >
//                         {msg.fromEmail.charAt(0).toUpperCase()}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center gap-2 mb-1 flex-wrap">
//                           {msg.direction === "received" ? (
//                             <Reply className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
//                           ) : (
//                             <Send className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
//                           )}
//                           <span className="font-semibold text-sm sm:text-base text-gray-800 truncate">
//                             {msg.fromEmail}
//                           </span>
//                           <span
//                             className={`text-xs px-2 py-0.5 rounded-full font-medium ${
//                               msg.direction === "received"
//                                 ? "bg-emerald-100 text-emerald-700"
//                                 : "bg-blue-100 text-blue-700"
//                             }`}
//                           >
//                             {msg.direction === "received" ? "Received" : "Sent"}
//                           </span>
//                         </div>
//                         <p className="text-sm sm:text-base font-medium text-gray-900 truncate mb-1">
//                           {msg.subject || "(No Subject)"}
//                         </p>
//                         <div className="flex items-center gap-2 flex-wrap">
//                           <p className="text-xs sm:text-sm text-gray-500 line-clamp-1 flex-1">
//                             {msg.body?.replace(/<[^>]*>/g, "") ||
//                               "No preview available"}
//                           </p>
//                           {msg.cc && (
//                             <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium flex-shrink-0">
//                               CC
//                             </span>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                     <div className="flex flex-col items-end gap-1 flex-shrink-0">
//                       <div className="text-xs text-gray-500 whitespace-nowrap">
//                         {new Date(msg.date).toLocaleDateString("en-US", {
//                           month: "short",
//                           day: "numeric",
//                         })}
//                       </div>
//                       <div className="text-xs text-gray-400 whitespace-nowrap">
//                         {new Date(msg.date).toLocaleTimeString([], {
//                           hour: "2-digit",
//                           minute: "2-digit",
//                         })}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="h-full flex flex-col bg-white">
//       {/* Message Detail Header */}
//       <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-white to-blue-50/30 sticky top-0 z-10 shadow-sm">
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
//           <button
//             onClick={() => setSelectedMsg(null)}
//             className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow self-start"
//           >
//             <ArrowLeft className="w-4 h-4" />
//             <span className="hidden sm:inline">Back to Messages</span>
//             <span className="sm:hidden">Back</span>
//           </button>

//           <button
//             onClick={() => handleSchedule(selectedMsg)}
//             className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:shadow-xl transition-all self-start sm:self-auto"
//           >
//             <Calendar className="w-4 h-4" />
//             <span>Schedule Follow-up</span>
//           </button>
//         </div>
//       </div>

//       {/* Message Content */}
//       <div className="flex-1 overflow-y-auto">
//         <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
//           <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
//             {/* Message Header Info */}
//             <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 p-4 sm:p-6 border-b-2 border-gray-200">
//               <div className="flex items-start gap-3 sm:gap-4 mb-4">
//                 <div
//                   className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white shadow-lg ${
//                     selectedMsg.direction === "received"
//                       ? "bg-gradient-to-br from-emerald-500 to-teal-600"
//                       : "bg-gradient-to-br from-blue-500 to-indigo-600"
//                   }`}
//                 >
//                   {selectedMsg.fromEmail.charAt(0).toUpperCase()}
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 break-words">
//                     {selectedMsg.subject || "(No Subject)"}
//                   </h2>
//                   <div className="space-y-1 text-sm">
//                     <p className="text-gray-700">
//                       <span className="font-semibold">From:</span>{" "}
//                       <span className="break-all">{selectedMsg.fromEmail}</span>
//                     </p>
//                     <p className="text-gray-700">
//                       <span className="font-semibold">To:</span>{" "}
//                       <span className="break-all">{selectedMsg.toEmail}</span>
//                     </p>
//                     {selectedMsg.cc && (
//                       <p className="text-gray-700">
//                         <span className="font-semibold">CC:</span>{" "}
//                         <span className="break-all">{selectedMsg.cc}</span>
//                       </p>
//                     )}
//                     <p className="text-gray-500 flex items-center gap-1 flex-wrap">
//                       <Clock className="w-3 h-3" />
//                       <span>{new Date(selectedMsg.date).toLocaleString()}</span>
//                     </p>
//                   </div>
//                 </div>
//               </div>

//               {selectedMsg.direction === "received" && (
//                 <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
//                   <Reply className="w-4 h-4 text-emerald-600" />
//                   <span className="text-sm font-medium text-emerald-700">
//                     Received Message
//                   </span>
//                 </div>
//               )}
//             </div>

//             {/* Message Body */}
//             <div className="p-4 sm:p-6 lg:p-8">
//               <div
//                 className="prose prose-sm sm:prose-base max-w-none text-gray-700"
//                 style={{ wordBreak: "break-word" }}
//                 dangerouslySetInnerHTML={{
//                   __html:
//                     selectedMsg.body?.replace(
//                       /src=["']\/uploads\//g,
//                       `src='${API_BASE_URL}/uploads/`
//                     ) || "<p class='text-gray-500 italic'>(No content)</p>",
//                 }}
//               ></div>
//             </div>

//             {/* Attachments */}
//             {selectedMsg.attachments?.length > 0 && (
//               <div className="p-4 sm:p-6 lg:p-8 border-t-2 border-gray-200 bg-gray-50/50">
//                 <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-base sm:text-lg">
//                   <Paperclip className="w-5 h-5 text-gray-600" />
//                   Attachments ({selectedMsg.attachments.length})
//                 </h4>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
//                   {selectedMsg.attachments.map((file, i) => {
//                     const fileUrl = file.url?.startsWith("http")
//                       ? file.url
//                       : `${API_BASE_URL}${file.url}`;
//                     return (
//                       <div
//                         key={i}
//                         className="group relative border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all bg-white"
//                       >
//                         <div className="flex flex-col items-center justify-center h-40 bg-gradient-to-br from-gray-50 to-blue-50/30 p-4">
//                           <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center mb-3 shadow-md">
//                             <Paperclip className="w-8 h-8 text-blue-600" />
//                           </div>
//                           <span className="text-xs font-medium text-gray-700 truncate w-full text-center px-2">
//                             {file.filename}
//                           </span>
//                         </div>
//                         <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-4">
//                           <a
//                             href={fileUrl}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="px-3 py-2 text-xs bg-white text-gray-800 rounded-lg flex items-center gap-1 font-semibold hover:bg-gray-100 shadow-lg"
//                           >
//                             <ExternalLink className="w-3 h-3" /> Open
//                           </a>
//                           <a
//                             href={fileUrl}
//                             download
//                             className="px-3 py-2 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1 font-semibold hover:bg-blue-700 shadow-lg"
//                           >
//                             <Download className="w-3 h-3" /> Save
//                           </a>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             )}
//             {/* 🆕 Reply Section */}
//             {/* 🧩 Reply Section */}
//             <div className="border-t-2 border-gray-200 bg-gray-50/70 p-4 sm:p-6">
//               <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
//                 Reply to{" "}
//                 {selectedMsg.fromEmail === selectedAccount.email
//                   ? selectedMsg.toEmail
//                   : selectedMsg.fromEmail}
//               </h4>

//               <textarea
//                 rows={4}
//                 value={replyBody}
//                 onChange={(e) => setReplyBody(e.target.value)}
//                 placeholder="Write your reply..."
//                 className="w-full border-2 border-gray-300 rounded-xl p-3 text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 mb-3"
//               ></textarea>

//               {/* Attachments preview */}
//               {replyAttachments.length > 0 && (
//                 <div className="mb-3 flex flex-wrap gap-2">
//                   {replyAttachments.map((file, i) => (
//                     <div
//                       key={i}
//                       className="px-3 py-2 text-xs rounded-lg bg-blue-100 text-blue-700 font-medium shadow-sm flex items-center gap-2"
//                     >
//                       <Paperclip className="w-3 h-3" />
//                       {file.name}
//                     </div>
//                   ))}
//                 </div>
//               )}

//               <div className="flex items-center justify-between">
//                 {/* File Upload Button */}
//                 <label className="flex items-center gap-2 text-sm font-semibold text-blue-600 cursor-pointer hover:underline">
//                   <Paperclip className="w-4 h-4" />
//                   Attach files
//                   <input
//                     type="file"
//                     multiple
//                     className="hidden"
//                     onChange={handleFileChange}
//                   />
//                 </label>

//                 <button
//                   onClick={() => handleReply(selectedMsg)}
//                   disabled={!replyBody.trim() || replying}
//                   className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md disabled:opacity-50"
//                 >
//                   {replying ? "Sending..." : "Send Reply"}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
