import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/EmployeeDashboard";
import Login from "./pages/Login";

function App() {
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  };

  const ProtectedRoute = ({ children, role }) => {
    const user = getUser();
    if (!user || !localStorage.getItem("token")) {
      return <Navigate to="/" />;
    }
    if (role && user.role !== role) {
      return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} />;
    }
    return children;
  };

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute role="employee">
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

// import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
// import Dashboard from "./pages/Dashboard"; // redirects after login
// import AdminDashboard from "./pages/AdminDashboard";
// import UserDashboard from "./pages/EmployeeDashboard"; // EmployeeDashboard is actually UserDashboard
// import Login from "./pages/Login";

// function App() {
//   const getUser = () => {
//     try {
//       return JSON.parse(localStorage.getItem("user"));
//     } catch {
//       return null;
//     }
//   };

//   // Protected Route Component
//   const ProtectedRoute = ({ children, role }) => {
//     const user = getUser();
//     if (!user || !localStorage.getItem("token")) {
//       return <Navigate to="/" />;
//     }
//     if (role && user.role !== role) {
//       // redirect to user's own dashboard if role mismatch
//       return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} />;
//     }
//     return children;
//   };

//   return (
//     <Router>
//       <Routes>
//         {/* Login */}
//         <Route path="/" element={<Login />} />

//         {/* Dashboard redirect after login */}
//         {/* <Route path="/dashboard" element={<Dashboard />} /> */}

//         {/* Admin Dashboard */}
//         <Route
//           path="/admin/dashboard"
//           element={
//             <ProtectedRoute role="admin">
//               <AdminDashboard />
//             </ProtectedRoute>
//           }
//         />

//         {/* User Dashboard */}
//         <Route
//           path="/user/dashboard"
//           element={
//             <ProtectedRoute role="employee">
//               <UserDashboard />
//             </ProtectedRoute>
//           }
//         />

//         {/* Fallback */}
//         <Route path="*" element={<Navigate to="/" />} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;
