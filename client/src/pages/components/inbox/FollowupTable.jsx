import React, { useState } from "react";

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export default function FollowupTable({ followups, onUpdate, onSend }) {
  const [editId, setEditId] = useState(null);
  const [editedData, setEditedData] = useState({});

  const handleEdit = (f) => {
    setEditId(f.id);
    setEditedData({
      followUpDate: f.followUpDate?.split("T")[0] || "",
      day: f.day || "",
    });
  };

  const handleSave = async (id) => {
    await onUpdate({ id, ...editedData });
    setEditId(null);
  };

  return (
    <div className="bg-white p-4 rounded-xl border shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        🕓 Pending Follow-Ups
      </h2>

      {followups.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No pending leads</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2 text-left">Client</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Last Follow-Up</th>
              <th className="p-2 text-left">Next Follow-Up (Day + Date)</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {followups.map((f) => (
              <tr key={f.id} className="border-b hover:bg-blue-50">
                <td className="p-2">{f.client}</td>
                <td
                  className="p-2 text-blue-600 cursor-pointer"
                  onClick={() => onSend(f)}
                >
                  {f.email}
                </td>

                <td className="p-2">
                  {f.day
                    ? `${f.day}, ${new Date(f.followUpDate).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}`
                    : "—"}
                </td>

                <td className="p-2">
                  {editId === f.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editedData.day}
                        onChange={(e) =>
                          setEditedData((d) => ({ ...d, day: e.target.value }))
                        }
                        className="border rounded px-2 py-1"
                      >
                        {WEEK_DAYS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={editedData.followUpDate}
                        onChange={(e) =>
                          setEditedData((d) => ({
                            ...d,
                            followUpDate: e.target.value,
                          }))
                        }
                        className="border rounded px-2 py-1"
                      />
                    </div>
                  ) : (
                    f.followUpDate && (
                      <span>
                        {new Date(f.followUpDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )
                  )}
                </td>

                <td className="p-2 text-center">
                  {editId === f.id ? (
                    <button
                      onClick={() => handleSave(f.id)}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEdit(f)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
