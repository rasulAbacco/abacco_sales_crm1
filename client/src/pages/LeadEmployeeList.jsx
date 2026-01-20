import React, { useState, useEffect } from "react";
import { getExternalEmployees } from "./externalCRMApi";


export default function LeadEmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");

  const fetchEmployees = async (id = "") => {
    try {
      setLoading(true);
      setError("");

      // ✅ fixed function call
      const res = await getExternalEmployees(id);

      if (res.data.success) {
        const data = Array.isArray(res.data.data)
          ? res.data.data
          : [res.data.data];
        setEmployees(data);
      } else {
        setError("Failed to fetch employee data");
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError(err.response?.data?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white shadow-lg rounded-xl mt-10">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">
        👩‍💼 External CRM - Employee Directory
      </h1>

      {/* Search Section */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="Search by Employee ID (e.g. EMP123)"
          className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          onClick={() => fetchEmployees(employeeId)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Search
        </button>
        <button
          onClick={() => {
            setEmployeeId("");
            fetchEmployees();
          }}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
        >
          Reset
        </button>
      </div>

      {/* Status Messages */}
      {loading && <p className="text-blue-500">Loading employees...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Employee Table */}
      {!loading && employees.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">#</th>
                <th className="border px-3 py-2 text-left">Employee ID</th>
                <th className="border px-3 py-2 text-left">Full Name</th>
                <th className="border px-3 py-2 text-left">Email</th>
                <th className="border px-3 py-2 text-left">Role</th>
                <th className="border px-3 py-2 text-left">Target</th>
                <th className="border px-3 py-2 text-left">Joining Date</th>
                <th className="border px-3 py-2 text-left">Active</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">{idx + 1}</td>
                  <td className="border px-3 py-2 font-medium">{emp.employeeId}</td>
                  <td className="border px-3 py-2">{emp.fullName}</td>
                  <td className="border px-3 py-2">{emp.email}</td>
                  <td className="border px-3 py-2">{emp.role}</td>
                  <td className="border px-3 py-2">{emp.target}</td>
                  <td className="border px-3 py-2">
                    {new Date(emp.joiningDate).toLocaleDateString()}
                  </td>
                  <td className="border px-3 py-2">
                    {emp.isActive ? (
                      <span className="text-green-600 font-semibold">✅ Active</span>
                    ) : (
                      <span className="text-red-500 font-semibold">❌ Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && employees.length === 0 && !error && (
        <p className="text-gray-500 mt-4">No employee data found.</p>
      )}
    </div>
  );
}
