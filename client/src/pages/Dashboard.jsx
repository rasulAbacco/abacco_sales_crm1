import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token || !user) {
      navigate("/");
    } else if (user.role === "admin") {
      navigate("/admin/dashboard");
    } else if (user.role === "employee") {
      navigate("/user/dashboard");
    } else {
      navigate("/user/dashboard");
    }
  }, [navigate]);

  return null; // this page just redirects
}
