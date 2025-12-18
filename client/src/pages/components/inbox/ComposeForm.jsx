import React, { useEffect, useState } from "react";
import {
  Loader2,
  Paperclip,
  X,
  CheckCircle,
  Send,
  ArrowLeft,
  Image,
  FileText,
  Plus,
  Upload,
} from "lucide-react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export default function ComposeForm({
  composeData,
  setComposeData,
  handleSendEmail,
  isSending,
  accounts,
}) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!composeData.from && accounts?.length > 0) {
      setComposeData((prev) => ({
        ...prev,
        from: prev.from || accounts[0].email,
      }));
    }
  }, [accounts, composeData.from, setComposeData]);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await fetch(`${API_BASE_URL}/api/uploads/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setAttachments((prev) => [...prev, ...data.files]);
        console.log("✅ Uploaded:", data.files);
      } else {
        alert("Upload failed. Try again.");
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      alert("File upload failed. Check console for details.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e) => {
    handleFileUpload(e.target.files);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    // ✅ Validation
    if (
      !composeData.from ||
      !composeData.to ||
      !composeData.subject ||
      !composeData.body
    ) {
      alert("Please fill in all required fields: From, To, Subject, and Body.");
      return;
    }

    // ✅ Prepare payload with all data
    const payload = {
      ...composeData,
      cc: composeData.cc || null,
      attachments: attachments || [],
      emailAccountId: accounts.find((acc) => acc.email === composeData.from)
        ?.id,
      leadId: composeData?.leadId || null,
      scheduledMessageId: composeData?.scheduledMessageId || null,

      // 🧩 Preserve formatting
      body: (composeData.body || "")
        .replace(/\n/g, "<br>")
        .replace(/  /g, "&nbsp;&nbsp;"),
    };

    console.log("📤 Sending email (with IDs):", payload);
    await handleSendEmail(payload);
  };

  const getFileIcon = (type) => {
    if (type?.startsWith("image/"))
      return <Image className="w-5 h-5 text-blue-600" />;
    return <FileText className="w-5 h-5 text-indigo-600" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50/50 py-4 sm:py-6 px-3 sm:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-200/50 overflow-hidden backdrop-blur-sm">
          {/* Gradient Header */}
          <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 sm:px-8 py-6 sm:py-8">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 w-full sm:w-auto">
                  <button
                    onClick={() => setComposeData(null)}
                    className="flex-shrink-0 p-2.5 text-white/90 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200"
                  >
                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <div className="flex-1">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 tracking-tight">
                      Compose Email
                    </h2>
                    <p className="text-blue-100 text-sm sm:text-base">
                      Create and send your follow-up message
                    </p>
                  </div>
                </div>

                {/* Desktop Send Button */}
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="hidden sm:flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 hover:shadow-2xl transition-all duration-200 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-5 sm:p-8 lg:p-10 space-y-6">
            {/* Email Fields Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* From Field */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                  From Account
                </label>
                <select
                  value={composeData.from || ""}
                  onChange={(e) =>
                    setComposeData({
                      ...composeData,
                      from: e.target.value,
                    })
                  }
                  className="w-full bg-gradient-to-br from-gray-50 to-blue-50/30 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-sm sm:text-base"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.email}>
                      {acc.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* To Field */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                  To Recipient
                  <span className="text-red-500 text-lg">*</span>
                </label>
                <input
                  type="email"
                  value={composeData.to || ""}
                  onChange={(e) =>
                    setComposeData({ ...composeData, to: e.target.value })
                  }
                  placeholder="recipient@example.com"
                  className="w-full bg-gradient-to-br from-gray-50 to-blue-50/30 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-sm sm:text-base"
                />
              </div>
            </div>

            {/* CC Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-gray-400 to-gray-500"></div>
                CC (Carbon Copy)
                <span className="text-xs font-normal text-gray-500 normal-case">
                  (Optional)
                </span>
              </label>
              <input
                type="email"
                value={composeData.cc || ""}
                onChange={(e) =>
                  setComposeData({ ...composeData, cc: e.target.value })
                }
                placeholder="cc@example.com"
                className="w-full bg-gradient-to-br from-gray-50 to-blue-50/30 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-sm sm:text-base"
              />
            </div>

            {/* Subject Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                Email Subject
                <span className="text-red-500 text-lg">*</span>
              </label>
              <input
                value={composeData.subject || ""}
                onChange={(e) =>
                  setComposeData({ ...composeData, subject: e.target.value })
                }
                placeholder="Enter your email subject..."
                className="w-full bg-gradient-to-br from-gray-50 to-blue-50/30 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 font-semibold text-sm sm:text-base"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                Message Body
              </label>
              <textarea
                value={composeData.body || ""}
                onChange={(e) =>
                  setComposeData({ ...composeData, body: e.target.value })
                }
                placeholder="Type your message here..."
                className="w-full bg-gradient-to-br from-gray-50 to-blue-50/30 border-2 border-gray-200 rounded-xl px-4 py-4 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 min-h-56 sm:min-h-72 resize-y text-sm sm:text-base leading-relaxed"
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                <Paperclip className="w-5 h-5 text-indigo-600" />
                File Attachments
              </label>

              {/* Drop Zone */}
              <div
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                className={`relative border-3 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-blue-500 bg-blue-50 scale-[1.02] shadow-xl"
                    : "border-gray-300 bg-gradient-to-br from-gray-50 to-blue-50/20 hover:border-blue-400 hover:bg-blue-50/50"
                }`}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />

                <div className="flex flex-col items-center gap-4">
                  <div
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isDragging
                        ? "bg-blue-500 scale-110"
                        : "bg-gradient-to-br from-blue-100 to-indigo-100"
                    }`}
                  >
                    {uploading ? (
                      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    ) : (
                      <Upload
                        className={`w-10 h-10 ${
                          isDragging ? "text-white" : "text-blue-600"
                        }`}
                      />
                    )}
                  </div>

                  {uploading ? (
                    <div className="space-y-2">
                      <p className="text-blue-600 font-bold text-base sm:text-lg">
                        Uploading files...
                      </p>
                      <div className="w-48 h-2 bg-blue-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full animate-pulse"
                          style={{ width: "70%" }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <p className="text-gray-800 font-bold text-base sm:text-lg">
                          {isDragging
                            ? "Drop files here!"
                            : "Drag & drop files here"}
                        </p>
                        <p className="text-sm text-gray-500">
                          or click the button below to browse
                        </p>
                      </div>

                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-200 inline-flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base"
                      >
                        <Plus className="w-5 h-5" />
                        Choose Files
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Uploaded Files Grid */}
              {attachments.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      Uploaded Files ({attachments.length})
                    </p>
                    <button
                      onClick={() => setAttachments([])}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="group relative bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                            {getFileIcon(file.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-800 font-semibold hover:text-blue-600 transition-colors block truncate text-sm"
                            >
                              {file.name}
                            </a>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </p>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="w-9 h-9 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center justify-center flex-shrink-0 hover:scale-110"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 px-5 sm:px-8 lg:px-10 py-6 border-t-2 border-gray-200">
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                <span className="text-red-500 font-bold">*</span> Required
                fields must be filled
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setComposeData(null)}
                  className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Fixed Send Button */}
          <div className="sm:hidden fixed bottom-4 left-4 right-4 z-50">
            <button
              onClick={handleSend}
              disabled={isSending}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-6 h-6" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
