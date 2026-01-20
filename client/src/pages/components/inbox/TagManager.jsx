import React, { useState } from "react";
import { api } from "../../api";

export default function TagManager({ tags, refreshTags }) {
  const [newTag, setNewTag] = useState("");

  const addTag = async () => {
    if (!newTag.trim()) return;
    try {
      await api.post("/tags", { name: newTag });
      setNewTag("");
      refreshTags();
    } catch (err) {
      console.error("Failed to create tag:", err);
    }
  };

  return (
    <div className="w-64 border-l border-gray-800 bg-gray-850 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold mb-2">Tags</h3>
        <div className="flex">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag"
            className="flex-1 bg-gray-800 text-white p-2 rounded-l focus:outline-none"
          />
          <button
            onClick={addTag}
            className="px-3 bg-blue-700 rounded-r hover:bg-blue-600"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {tags.map((tag) => (
          <div key={tag.id} className="p-2 text-sm text-gray-300 border-b border-gray-700">
            <span
              className="inline-block px-2 py-1 rounded bg-gray-700 text-xs"
              style={{ borderLeft: `4px solid ${tag.color || "#00bfff"}` }}
            >
              {tag.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
