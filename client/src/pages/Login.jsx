import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  CheckCircle,
  Sparkles,
  ShoppingCart,
  TrendingUp,
  Star,
  Zap,
} from "lucide-react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isLogin
      ? `${API_BASE_URL}/api/auth/login`
      : `${API_BASE_URL}/api/auth/signup`;

    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("🔹 Backend response:", data);

      if (!res.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      const role = data.user?.role?.toLowerCase();
      setUserRole(role);

      let message = "";
      if (role === "admin") {
        message = "Welcome Admin!";
      } else if (role === "employee") {
        message = "Welcome Employee!";
      } else {
        message = "Welcome Back!";
      }

      setWelcomeMessage(message);
      setShowWelcome(true);

      setTimeout(() => {
        if (role === "admin") {
          navigate("/admin/dashboard");
        } else if (role === "employee") {
          navigate("/user/dashboard");
        } else {
          navigate("/user/dashboard");
        }
      }, 3500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-drift-1 top-0 -left-4"></div>
        <div className="absolute w-96 h-96 bg-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-drift-2 top-0 right-0"></div>
        <div className="absolute w-96 h-96 bg-fuchsia-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-drift-3 bottom-0 left-20"></div>
      </div>

      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      {/* Welcome Overlay Animation */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, #7F27FF 0%, #9D4EDD 50%, #C77DFF 100%)",
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute w-2 h-2 bg-white rounded-full animate-particle-1"
              style={{ top: "20%", left: "10%" }}
            ></div>
            <div
              className="absolute w-3 h-3 bg-white rounded-full animate-particle-2"
              style={{ top: "60%", left: "80%" }}
            ></div>
            <div
              className="absolute w-2 h-2 bg-white rounded-full animate-particle-3"
              style={{ top: "40%", left: "70%" }}
            ></div>
            <div
              className="absolute w-4 h-4 bg-white rounded-full animate-particle-4"
              style={{ top: "80%", left: "20%" }}
            ></div>
            <div
              className="absolute w-2 h-2 bg-white rounded-full animate-particle-5"
              style={{ top: "30%", left: "50%" }}
            ></div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-96 h-96 border-2 border-white/20 rounded-full animate-pulse-circle-1"></div>
            <div className="w-96 h-96 border-2 border-white/20 rounded-full absolute animate-pulse-circle-2"></div>
            <div className="w-96 h-96 border-2 border-white/20 rounded-full absolute animate-pulse-circle-3"></div>
          </div>

          <div className="relative z-10 text-center animate-entrance">
            <div className="mb-10 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-hexagon-rotate">
                  <svg
                    width="180"
                    height="180"
                    viewBox="0 0 180 180"
                    className="absolute"
                  >
                    <polygon
                      points="90,10 160,50 160,130 90,170 20,130 20,50"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      opacity="0.4"
                    />
                  </svg>
                </div>

                <div className="w-44 h-44 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center relative animate-glow-pulse shadow-2xl">
                  <Star className="w-6 h-6 text-yellow-300 absolute -top-3 -right-3 animate-star-twinkle" />
                  <Zap className="w-5 h-5 text-yellow-300 absolute -bottom-2 -left-2 animate-zap-flash" />

                  {userRole === "admin" ? (
                    <TrendingUp className="w-24 h-24 text-white animate-bounce-in" />
                  ) : (
                    <ShoppingCart className="w-24 h-24 text-white animate-bounce-in" />
                  )}

                  <div className="absolute -bottom-4 -right-4 bg-green-500 rounded-full p-3 animate-success-badge shadow-lg">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                </div>

                <Sparkles
                  className="w-8 h-8 text-yellow-300 absolute animate-orbit-1"
                  style={{ top: "10%", left: "-10%" }}
                />
                <Sparkles
                  className="w-6 h-6 text-yellow-300 absolute animate-orbit-2"
                  style={{ top: "80%", right: "-5%" }}
                />
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 animate-text-reveal">
                Awesome!
              </h2>
            </div>

            <div className="mb-10 animate-text-reveal-delayed">
              <p className="text-3xl md:text-4xl text-white font-semibold drop-shadow-lg">
                {welcomeMessage}
              </p>
              <p className="text-xl text-white/80 mt-2">
                Let's get started! 🚀
              </p>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              <div className="w-4 h-4 bg-white rounded-full animate-dot-bounce"></div>
              <div
                className="w-4 h-4 bg-white rounded-full animate-dot-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-4 h-4 bg-white rounded-full animate-dot-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>

            <div className="w-80 h-2 bg-white/20 rounded-full mx-auto overflow-hidden backdrop-blur-sm">
              <div className="h-full bg-gradient-to-r from-white via-yellow-300 to-white rounded-full animate-countdown-bar"></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-2">
            <ShoppingCart className="w-10 h-10" style={{ color: "#7F27FF" }} />
            <h1
              className="text-4xl md:text-5xl font-bold tracking-tight"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #7F27FF, #9D4EDD, #C77DFF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Abacco Sales CRM
            </h1>
          </div>
          <p className="text-lg md:text-xl text-gray-600 font-light">
            Sales & Customer Relationship Management
          </p>
        </div>

        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-gray-100">
            <h2
              className="text-3xl font-bold mb-2 text-center"
              style={{
                backgroundImage: "linear-gradient(to right, #7F27FF, #9D4EDD)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-gray-500 text-center mb-6">
              {isLogin ? "Sign in to continue" : "Join our sales team"}
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border-2 border-red-200 animate-shake">
                <p className="font-medium text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    style={{ "--tw-ring-color": "#7F27FF" }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ "--tw-ring-color": "#7F27FF" }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-12"
                    style={{ "--tw-ring-color": "#7F27FF" }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl mt-6"
                style={{
                  backgroundImage: isLogin
                    ? "linear-gradient(to right, #7F27FF, #9D4EDD)"
                    : "linear-gradient(to right, #16a34a, #22c55e)",
                }}
                disabled={loading || showWelcome}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {isLogin ? "Logging in..." : "Creating account..."}
                  </span>
                ) : isLogin ? (
                  "Login"
                ) : (
                  "Sign Up"
                )}
              </button>
            </form>
            {/* 
            <p className="text-center text-sm text-gray-600 mt-6">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="font-semibold hover:underline"
                style={{ color: "#7F27FF" }}
              >
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </p>  */}
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm animate-fade-in">
          {/* <p>© 2024 Abacco Sales CRM. All rights reserved.</p> */}
          <p>
            © {new Date().getFullYear()} Abacco Sales CRM. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, -80px) scale(1.2); }
        }
        @keyframes drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-60px, 70px) scale(1.15); }
        }
        @keyframes drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(70px, 60px) scale(1.1); }
        }
        @keyframes particle-1 {
          0%, 100% { transform: translate(0, 0) scale(0); opacity: 0; }
          50% { transform: translate(100px, -200px) scale(1.5); opacity: 1; }
        }
        @keyframes particle-2 {
          0%, 100% { transform: translate(0, 0) scale(0); opacity: 0; }
          50% { transform: translate(-150px, 150px) scale(2); opacity: 0.8; }
        }
        @keyframes particle-3 {
          0%, 100% { transform: translate(0, 0) scale(0); opacity: 0; }
          50% { transform: translate(120px, 180px) scale(1.2); opacity: 1; }
        }
        @keyframes particle-4 {
          0%, 100% { transform: translate(0, 0) scale(0); opacity: 0; }
          50% { transform: translate(-100px, -150px) scale(1.8); opacity: 0.9; }
        }
        @keyframes particle-5 {
          0%, 100% { transform: translate(0, 0) scale(0); opacity: 0; }
          50% { transform: translate(80px, -100px) scale(1.3); opacity: 0.7; }
        }
        @keyframes pulse-circle-1 {
          0% { transform: scale(0.8); opacity: 0.4; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes pulse-circle-2 {
          0% { transform: scale(0.8); opacity: 0.3; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes pulse-circle-3 {
          0% { transform: scale(0.8); opacity: 0.2; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes entrance {
          0% { transform: scale(0.3) translateY(100px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes hexagon-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.3); }
          50% { box-shadow: 0 0 40px rgba(255, 255, 255, 0.6), 0 0 60px rgba(127, 39, 255, 0.4); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0) rotate(-180deg); }
          60% { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes success-badge {
          0% { transform: scale(0) rotate(180deg); }
          60% { transform: scale(1.2) rotate(-10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes star-twinkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.5) rotate(180deg); opacity: 0.5; }
        }
        @keyframes zap-flash {
          0%, 100% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes orbit-1 {
          0% { transform: rotate(0deg) translateX(100px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
        }
        @keyframes orbit-2 {
          0% { transform: rotate(180deg) translateX(100px) rotate(-180deg); }
          100% { transform: rotate(540deg) translateX(100px) rotate(-540deg); }
        }
        @keyframes text-reveal {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes text-reveal-delayed {
          0% { opacity: 0; transform: translateY(30px); }
          50% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes countdown-bar {
          0% { width: 0%; transform: translateX(-100%); }
          100% { width: 100%; transform: translateX(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .animate-drift-1 { animation: drift-1 10s ease-in-out infinite; }
        .animate-drift-2 { animation: drift-2 12s ease-in-out infinite; }
        .animate-drift-3 { animation: drift-3 14s ease-in-out infinite; }
        .animate-particle-1 { animation: particle-1 3s ease-out infinite; }
        .animate-particle-2 { animation: particle-2 4s ease-out infinite; }
        .animate-particle-3 { animation: particle-3 3.5s ease-out infinite; }
        .animate-particle-4 { animation: particle-4 4.5s ease-out infinite; }
        .animate-particle-5 { animation: particle-5 3.8s ease-out infinite; }
        .animate-pulse-circle-1 { animation: pulse-circle-1 2.5s ease-out infinite; }
        .animate-pulse-circle-2 { animation: pulse-circle-2 2.5s ease-out 0.5s infinite; }
        .animate-pulse-circle-3 { animation: pulse-circle-3 2.5s ease-out 1s infinite; }
        .animate-entrance { animation: entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-hexagon-rotate { animation: hexagon-rotate 10s linear infinite; }
        .animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
        .animate-bounce-in { animation: bounce-in 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s backwards; }
        .animate-success-badge { animation: success-badge 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.8s backwards; }
        .animate-star-twinkle { animation: star-twinkle 2s ease-in-out infinite; }
        .animate-zap-flash { animation: zap-flash 1.5s ease-in-out infinite; }
        .animate-orbit-1 { animation: orbit-1 8s linear infinite; }
        .animate-orbit-2 { animation: orbit-2 8s linear infinite; }
        .animate-text-reveal { animation: text-reveal 0.8s ease-out 0.3s backwards; }
        .animate-text-reveal-delayed { animation: text-reveal-delayed 1.2s ease-out; }
        .animate-dot-bounce { animation: dot-bounce 1s ease-in-out infinite; }
        .animate-countdown-bar { animation: countdown-bar 3.5s linear; }
        .animate-fade-in { animation: fade-in 1s ease-out; }
        .animate-slide-up { animation: slide-up 0.6s ease-out; }
        .animate-shake { animation: shake 0.3s ease-in-out; }

        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        input:focus {
          outline: 2px solid #7F27FF;
        }
      `}</style>
    </div>
  );
}
