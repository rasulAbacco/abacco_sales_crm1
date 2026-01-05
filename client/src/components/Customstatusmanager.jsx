import React, { useState } from "react";
import { X, Plus, Edit2, Trash2, Save } from "lucide-react";

export default function CustomStatusManager({
  isOpen,
  onClose,
  customStatuses,
  onStatusCreated,
  onStatusUpdated,
  onStatusDeleted,
}) {
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState(
    "bg-gray-100 text-gray-800 border-gray-200"
  );
  const [newStatusDescription, setNewStatusDescription] = useState("");
  const [editingStatus, setEditingStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const colorOptions = [
    { value: "bg-gray-100 text-gray-800 border-gray-200", label: "Gray" },
    { value: "bg-red-100 text-red-800 border-red-200", label: "Red" },
    {
      value: "bg-orange-100 text-orange-800 border-orange-200",
      label: "Orange",
    },
    { value: "bg-amber-100 text-amber-800 border-amber-200", label: "Amber" },
    {
      value: "bg-yellow-100 text-yellow-800 border-yellow-200",
      label: "Yellow",
    },
    { value: "bg-lime-100 text-lime-800 border-lime-200", label: "Lime" },
    { value: "bg-green-100 text-green-800 border-green-200", label: "Green" },
    {
      value: "bg-emerald-100 text-emerald-800 border-emerald-200",
      label: "Emerald",
    },
    { value: "bg-teal-100 text-teal-800 border-teal-200", label: "Teal" },
    { value: "bg-cyan-100 text-cyan-800 border-cyan-200", label: "Cyan" },
    { value: "bg-sky-100 text-sky-800 border-sky-200", label: "Sky" },
    { value: "bg-blue-100 text-blue-800 border-blue-200", label: "Blue" },
    {
      value: "bg-indigo-100 text-indigo-800 border-indigo-200",
      label: "Indigo",
    },
    {
      value: "bg-violet-100 text-violet-800 border-violet-200",
      label: "Violet",
    },
    {
      value: "bg-purple-100 text-purple-800 border-purple-200",
      label: "Purple",
    },
    {
      value: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
      label: "Fuchsia",
    },
    { value: "bg-pink-100 text-pink-800 border-pink-200", label: "Pink" },
    { value: "bg-rose-100 text-rose-800 border-rose-200", label: "Rose" },
  ];

  const handleCreateStatus = async () => {
    if (!newStatusName.trim()) {
      alert("Please enter a status name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/customStatus`,

        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newStatusName,
            color: newStatusColor,
            description: newStatusDescription,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        onStatusCreated(data.data);
        setNewStatusName("");
        setNewStatusColor("bg-gray-100 text-gray-800 border-gray-200");
        setNewStatusDescription("");
        alert("✅ Custom status created successfully!");
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Error creating status:", error);
      alert("❌ Failed to create status");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/customStatus/${status.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(status),
        }
      );

      const data = await res.json();

      if (data.success) {
        onStatusUpdated(data.data);
        setEditingStatus(null);
        alert("✅ Status updated successfully!");
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("❌ Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async (id) => {
    if (!confirm("Are you sure you want to delete this status?")) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/customStatus${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (data.success) {
        onStatusDeleted(id);
        alert("✅ Status deleted successfully!");
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      console.error("Error deleting status:", error);
      alert("❌ Failed to delete status");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Manage Custom Lead Statuses
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Create New Status */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
            <h3 className="text-base font-semibold text-indigo-900 mb-4">
              Create New Status
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Name *
                </label>
                <input
                  type="text"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  placeholder="e.g., Negotiation, Qualified Lead, Hot Lead"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <select
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {colorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* Color Preview */}
                <div className="mt-2">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${newStatusColor}`}
                  >
                    Preview
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newStatusDescription}
                  onChange={(e) => setNewStatusDescription(e.target.value)}
                  placeholder="Brief description of this status..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                onClick={handleCreateStatus}
                disabled={loading || !newStatusName.trim()}
                className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Create Status
              </button>
            </div>
          </div>

          {/* Existing Custom Statuses */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Your Custom Statuses ({customStatuses.length})
            </h3>

            {customStatuses.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-500">
                  No custom statuses yet. Create one above!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {customStatuses.map((status) => (
                  <div
                    key={status.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
                  >
                    {editingStatus?.id === status.id ? (
                      /* Edit Mode */
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingStatus.name}
                          onChange={(e) =>
                            setEditingStatus({
                              ...editingStatus,
                              name: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />

                        <select
                          value={editingStatus.color}
                          onChange={(e) =>
                            setEditingStatus({
                              ...editingStatus,
                              color: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          {colorOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <textarea
                          value={editingStatus.description || ""}
                          onChange={(e) =>
                            setEditingStatus({
                              ...editingStatus,
                              description: e.target.value,
                            })
                          }
                          placeholder="Description..."
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                        />

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateStatus(editingStatus)}
                            disabled={loading}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingStatus(null)}
                            className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}
                            >
                              {status.name}
                            </span>
                          </div>
                          {status.description && (
                            <p className="text-sm text-gray-600">
                              {status.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingStatus(status)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStatus(status.id)}
                            disabled={loading}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
