//client/src/pages/AddEmployee.jsx
import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  X,
  Search,
  Users,
  Download,
  Upload,
  Filter,
  Mail,
  AlertTriangle,
} from "lucide-react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
// Replace with your actual API import: import { api } from "./api";
const api = {
  get: async (url) => fetch(url).then((r) => r.json()),
  post: async (url, data) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
  put: async (url, data) =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
  delete: async (url) => fetch(url, { method: "DELETE" }).then((r) => r.json()),
};

export default function AddEmployee() {
  const [form, setForm] = useState({
    empId: "",
    name: "",
    email: "",
    password: "",
    isAlive: true,
  });
  const [employees, setEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchEmployees = async () => {
    try {
      const res = await api.get(`${API_BASE_URL}/api/employees`);
      setEmployees(res.data || res);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.empId) {
      setError("Please fill in all required fields including Employee ID");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post(
        `
${API_BASE_URL}/api/auth/signup`,
        form
      );
      setSuccess("Employee added successfully!");
      setForm({ empId: "", name: "", email: "", password: "", isAlive: true });
      setShowAddForm(false);
      fetchEmployees();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Operation failed"
      );
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingEmployee) return;

    if (!editingEmployee.name || !editingEmployee.email) {
      setError("Please fill in all required fields");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.put(
        `${API_BASE_URL}/api/employees/${editingEmployee.id}`,
        editingEmployee
      );
      setSuccess("Employee updated successfully!");
      setEditingEmployee(null);
      fetchEmployees();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating employee:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Update failed"
      );
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (emp) => {
    setEditingEmployee({ ...emp, password: "" });
    setShowAddForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    setDeleteConfirm(null);
    try {
      await api.delete(`${API_BASE_URL}/api/employees/${id}`);
      setSuccess("Employee deleted successfully!");
      fetchEmployees();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error deleting employee:", err);
      setError("Failed to delete employee");
      setTimeout(() => setError(""), 3000);
    }
  };

  const toggleEmployeeStatus = async (emp) => {
    try {
      const newStatus = !emp.isAlive;
      await api.put(`${API_BASE_URL}/api/employees/${emp.id}`, {
        isAlive: newStatus,
      });
      setSuccess(
        `Employee ${newStatus ? "activated" : "deactivated"} successfully!`
      );
      fetchEmployees();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error toggling employee status:", err);
      setError("Failed to update employee status");
      setTimeout(() => setError(""), 3000);
    }
  };

  const togglePasswordVisibility = (empId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [empId]: !prev[empId],
    }));
  };

  const handleKeyPress = (e, action) => {
    if (e.key === "Enter") {
      action();
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const activeEmployees = employees.filter(
    (emp) => emp.isAlive !== false
  ).length;
  const inactiveEmployees = employees.filter(
    (emp) => emp.isAlive === false
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Employee Management
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Manage your team members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Export data"
              >
                <Download className="w-5 h-5 text-gray-600" />
              </button>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Import data"
              >
                <Upload className="w-5 h-5 text-gray-600" />
              </button>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Filter"
              >
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-green-800 font-medium text-sm">
              {success}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-800 font-medium text-sm">{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Employees
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {employees.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {activeEmployees}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {inactiveEmployees}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Header with Search and Add Button */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  All Employees
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Manage your team members and their access
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-64"
                  />
                </div>
                <button
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Employee
                </button>
              </div>
            </div>
          </div>

          {/* Add/Edit Form */}
          {(showAddForm || editingEmployee) && (
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="max-w-3xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {editingEmployee ? (
                      <>
                        <Edit className="w-5 h-5 text-green-600" />
                        Edit Employee
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                        Add New Employee
                      </>
                    )}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingEmployee(null);
                      setForm({
                        empId: "",
                        name: "",
                        email: "",
                        password: "",
                        isAlive: true,
                      });
                    }}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Employee ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={
                          editingEmployee ? editingEmployee.empId : form.empId
                        }
                        onChange={(e) =>
                          editingEmployee
                            ? setEditingEmployee({
                                ...editingEmployee,
                                empId: e.target.value,
                              })
                            : setForm({ ...form, empId: e.target.value })
                        }
                        disabled={!!editingEmployee}
                        placeholder="e.g., EMP001"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={
                          editingEmployee ? editingEmployee.name : form.name
                        }
                        onChange={(e) =>
                          editingEmployee
                            ? setEditingEmployee({
                                ...editingEmployee,
                                name: e.target.value,
                              })
                            : setForm({ ...form, name: e.target.value })
                        }
                        placeholder="John Doe"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={
                            editingEmployee ? editingEmployee.email : form.email
                          }
                          onChange={(e) =>
                            editingEmployee
                              ? setEditingEmployee({
                                  ...editingEmployee,
                                  email: e.target.value,
                                })
                              : setForm({ ...form, email: e.target.value })
                          }
                          placeholder="john@company.com"
                          className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Employee Active <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={
                          editingEmployee
                            ? editingEmployee.isAlive
                            : form.isAlive
                        }
                        onChange={(e) => {
                          const value = e.target.value === "true";
                          editingEmployee
                            ? setEditingEmployee({
                                ...editingEmployee,
                                isAlive: value,
                              })
                            : setForm({ ...form, isAlive: value });
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      New Password{" "}
                      {editingEmployee ? (
                        <span className="text-gray-500 font-normal text-xs">
                          (leave blank to keep current)
                        </span>
                      ) : (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={
                          editingEmployee
                            ? showEditPassword
                              ? "text"
                              : "password"
                            : showPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          editingEmployee
                            ? editingEmployee.password || ""
                            : form.password
                        }
                        onChange={(e) =>
                          editingEmployee
                            ? setEditingEmployee({
                                ...editingEmployee,
                                password: e.target.value,
                              })
                            : setForm({ ...form, password: e.target.value })
                        }
                        onKeyPress={(e) =>
                          handleKeyPress(
                            e,
                            editingEmployee ? handleUpdate : handleSubmit
                          )
                        }
                        placeholder="••••••••"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          editingEmployee
                            ? setShowEditPassword(!showEditPassword)
                            : setShowPassword(!showPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {(editingEmployee ? showEditPassword : showPassword) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingEmployee(null);
                        setForm({
                          empId: "",
                          name: "",
                          email: "",
                          password: "",
                          isAlive: true,
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={editingEmployee ? handleUpdate : handleSubmit}
                      disabled={loading}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {editingEmployee ? "Updating..." : "Adding..."}
                        </>
                      ) : (
                        <>
                          {editingEmployee ? (
                            <>
                              <Edit className="w-4 h-4" /> Update Employee
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" /> Add Employee
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employee Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Employee ID
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Password
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {getInitials(emp.name)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {emp.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {emp.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                        {emp.empId}
                      </span>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 font-mono">
                          {visiblePasswords[emp.empId] ? (emp.password || '••••••••') : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(emp.empId)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title={visiblePasswords[emp.empId] ? "Hide password" : "Show password"}
                        >
                          {visiblePasswords[emp.empId] ? (
                            <EyeOff className="w-4 h-4 text-gray-500" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleEmployeeStatus(emp)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          emp.isAlive !== false ? "bg-green-500" : "bg-gray-300"
                        }`}
                        title={
                          emp.isAlive !== false
                            ? "Active - Click to deactivate"
                            : "Inactive - Click to activate"
                        }
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            emp.isAlive !== false
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span
                        className={`ml-2 text-xs font-medium ${
                          emp.isAlive !== false
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {emp.isAlive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit employee"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(emp)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          No employees found
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {searchTerm
                            ? "Try adjusting your search terms"
                            : "Get started by adding your first employee"}
                        </p>
                        {!searchTerm && !showAddForm && (
                          <button
                            onClick={() => setShowAddForm(true)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                          >
                            <UserPlus className="w-4 h-4" />
                            Add First Employee
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {filteredEmployees.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {filteredEmployees.length}
                  </span>{" "}
                  of <span className="font-medium">{employees.length}</span>{" "}
                  employees
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Delete Employee?
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone. This will permanently delete the
                  employee record.
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                Employee Details
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(deleteConfirm.name)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {deleteConfirm.name}
                  </p>
                  <p className="text-sm text-gray-500">{deleteConfirm.email}</p>
                  <p className="text-xs text-gray-400 font-mono">
                    {deleteConfirm.empId}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
