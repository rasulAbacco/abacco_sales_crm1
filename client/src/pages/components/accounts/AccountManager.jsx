import React, { useState, useEffect } from "react";
import { api } from "../../api";

export default function AccountManager({ onAccountSelected, onAccountAdded, currentSelectedAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [form, setForm] = useState({
    userId: 1,
    email: "",
    provider: "gmail",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    imapUser: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "", 
    encryptedPass: "",
    oauthClientId: "",
    oauthClientSecret: "",
    refreshToken: "",
    authType: "password",
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [accountToLogout, setAccountToLogout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { fetchAccounts(); }, []);
  useEffect(() => { 
    if (currentSelectedAccount) {
      setSelectedAccountId(currentSelectedAccount.id);
    } else if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
      if (onAccountSelected) onAccountSelected(accounts[0]);
    }
  }, [currentSelectedAccount, accounts, selectedAccountId]);
  useEffect(() => {
    if (showSuccessMessage) {
      const t = setTimeout(() => setShowSuccessMessage(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showSuccessMessage]);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/accounts");
      setAccounts(res.data);
    } catch (err) {
      setError("Failed to fetch accounts");
    } finally { 
      setLoading(false);
    }
  };

  // const addAccount = async (e) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   setError(null);

  //   try {
  //     const formData = { ...form };
  //     if (form.authType === "password") {
  //       formData.oauthClientId = "";
  //       formData.oauthClientSecret = "";
  //       formData.refreshToken = "";
  //     } else {
  //       formData.encryptedPass = "";
  //     }
  //     if (!formData.smtpUser) formData.smtpUser = formData.email;

  //     const res = await api.post("/accounts", formData);
  //     const newAcc = res.data;

  //     setForm({
  //       userId: 1,
  //       email: "",
  //       provider: form.provider,
  //       imapHost: form.imapHost,
  //       imapPort: form.imapPort,
  //       imapUser: "",
  //       smtpHost: form.smtpHost,
  //       smtpPort: form.smtpPort,
  //       smtpUser: "",
  //       encryptedPass: "",
  //       oauthClientId: "",
  //       oauthClientSecret: "",
  //       refreshToken: "",
  //       authType: form.authType,
  //     });

  //     await fetchAccounts();
  //     setSelectedAccountId(newAcc.id);
  //     if (onAccountSelected) onAccountSelected(newAcc, true);
  //     setShowSuccessMessage(true);
  //     if (onAccountAdded) onAccountAdded();
  //   } catch (err) {
  //     setError(err.response?.data?.error || "Failed to add account");
  //   } finally { 
  //     setLoading(false);
  //   }
  // };
  
  const addAccount = async (e) => {
    e.preventDefault();
    setError(null);
    localStorage.setItem("outlookClientId", form.oauthClientId);
    localStorage.setItem("outlookClientSecret", form.oauthClientSecret);
    localStorage.setItem("outlookEmail", form.email);


    if (form.authType === "oauth" && form.provider === "outlook") {
      try {
        const res = await api.get("/auth/outlook/auth-url", {
          params: {
            clientId: form.oauthClientId,
            redirectUri: window.location.origin + "/oauth/outlook/callback"
          },
        });
        const { url } = res.data;
        window.location.href = url; // Redirect to Microsoft login
      } catch (err) {
        setError("Failed to initiate Outlook OAuth");
      }
      return;
    }

    setLoading(true);
    try {
      const formData = { ...form };
      if (form.authType === "password") {
        formData.oauthClientId = "";
        formData.oauthClientSecret = "";
        formData.refreshToken = "";
      } else {
        formData.encryptedPass = "";
      }
      if (!formData.smtpUser) formData.smtpUser = formData.email;

      const res = await api.post("/accounts", formData);
      const newAcc = res.data;

      setForm({
        userId: 1,
        email: "",
        provider: form.provider,
        imapHost: form.imapHost,
        imapPort: form.imapPort,
        imapUser: "",
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort,
        smtpUser: "",
        encryptedPass: "",
        oauthClientId: "",
        oauthClientSecret: "",
        refreshToken: "",
        authType: form.authType,
      });

      await fetchAccounts();
      setSelectedAccountId(newAcc.id);
      if (onAccountSelected) onAccountSelected(newAcc, true);
      setShowSuccessMessage(true);
      if (onAccountAdded) onAccountAdded();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add account");
    } finally {
      setLoading(false);
    }
  };

  
  const confirmLogout = (id) => { 
    setAccountToLogout(id); 
    setShowLogoutConfirm(true); 
  };
  
  const logoutAccount = async () => {
    if (!accountToLogout) return;
    setLoading(true);
    try {
      await api.delete(`/accounts/${accountToLogout}`);
      const updatedAccounts = accounts.filter((a) => a.id !== accountToLogout);
      setAccounts(updatedAccounts);
      
      if (selectedAccountId === accountToLogout) {
        if (updatedAccounts.length > 0) {
          const nextAccount = updatedAccounts[0];
          setSelectedAccountId(nextAccount.id);
          if (onAccountSelected) onAccountSelected(nextAccount);
        } else {
          setSelectedAccountId(null);
          if (onAccountSelected) onAccountSelected(null);
        }
      }
      
      setShowLogoutConfirm(false);
      setAccountToLogout(null);
    } catch (err) {
      console.error("Logout error:", err);
      setError("Failed to logout account");
    } finally { 
      setLoading(false);
    }
  };

  const handleAccountSelect = (acc) => {
    setSelectedAccountId(acc.id);
    if (onAccountSelected) onAccountSelected(acc, true);
  };

  const handleEmailChange = (e) => {
    const email = e.target.value;
    setForm({ ...form, email, imapUser: email, smtpUser: email });
  };

  const handleProviderChange = (e) => {
    const provider = e.target.value;
    let newForm = { ...form, provider };
    switch (provider) {
      case "gmail":
      case "gsuite":
        newForm.imapHost = "imap.gmail.com"; newForm.imapPort = 993;
        newForm.smtpHost = "smtp.gmail.com"; newForm.smtpPort = 587;
        break;
      case "outlook":
        newForm.imapHost = "outlook.office365.com"; newForm.imapPort = 993;
        newForm.smtpHost = "smtp.office365.com"; newForm.smtpPort = 587;
        break;
      case "zoho":
        newForm.imapHost = "imappro.zoho.in"; newForm.imapPort = 993;
        newForm.smtpHost = "smtppro.zoho.in"; newForm.smtpPort = 587;
        break;
      case "rediff":
        newForm.imapHost = "imap.rediffmailpro.com"; newForm.imapPort = 993;
        newForm.smtpHost = "smtp.rediffmailpro.com"; newForm.smtpPort = 465;
        break;
      case "amazon":
        newForm.imapHost = "imap.mail.us-east-1.awsapps.com"; newForm.imapPort = 993;
        newForm.smtpHost = "smtp.mail.us-east-1.awsapps.com"; newForm.smtpPort = 465;
        break;
      case "yahoo":
        newForm.imapHost = "imap.mail.yahoo.com"; newForm.imapPort = 993;
        newForm.smtpHost = "smtp.mail.yahoo.com"; newForm.smtpPort = 465;
        break;
      default:
        newForm.imapHost = ""; newForm.imapPort = 993;
        newForm.smtpHost = ""; newForm.smtpPort = 587;
    }
    setForm(newForm);
  };

  return (
    <div className="p-6 bg-gray-800 min-h-screen text-white">
      {error && <div className="mb-4 p-3 bg-red-600 rounded">{error}</div>}
      {showSuccessMessage && <div className="mb-4 p-3 bg-green-600 rounded">✅ Account added successfully!</div>}

      <h2 className="text-lg font-bold mb-4">Email Accounts</h2>

      {/* List accounts */}
      <div className="mb-6">
        {accounts.length === 0 ? (
          <div className="text-gray-400">No accounts configured. Add one below.</div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => handleAccountSelect(acc)}
              className={`border p-3 rounded mb-2 cursor-pointer ${selectedAccountId === acc.id ? "bg-blue-900 border-blue-500" : "bg-black hover:bg-gray-700"}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div>{acc.email}</div>
                  <div className="text-sm text-gray-400">{acc.provider} · {acc.imapHost}:{acc.imapPort}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); confirmLogout(acc.id); }}
                        className="px-3 py-1 bg-red-600 rounded text-sm">Logout</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add new account */}
      <h3 className="mb-2">Add New Account</h3>
      <form onSubmit={addAccount} className="space-y-3 bg-gray-700 p-4 rounded">
        {/* Provider */}
        <div>
          <label>Provider</label>
          <select value={form.provider} onChange={handleProviderChange} className="w-full p-2 border rounded text-white bg-gray-700 ">
            <option value="gmail" className="bg-gray-500">Gmail</option>
            <option value="gsuite">G Suite</option>
            <option value="outlook">Outlook (Office 365)</option>
            <option value="zoho">Zoho</option>
            <option value="rediff">Rediff</option>
            <option value="amazon">Amazon WorkMail</option>
            <option value="yahoo">Yahoo</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Auth type */}
        <div>
          <label>Authentication</label>
          <select value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })}
            className="w-full p-2 border rounded text-white bg-gray-700 ">
            <option value="password">App Password</option>
            <option value="oauth">OAuth2</option>
          </select>
        </div>

        {/* Common fields */}
        <input type="email" placeholder="Email Address" value={form.email} onChange={handleEmailChange}
          className="w-full p-2 border rounded text-white" required />

        {/* IMAP/SMTP */}
        <input type="text" placeholder="IMAP Host" value={form.imapHost}
          onChange={(e) => setForm({ ...form, imapHost: e.target.value })} className="w-full p-2 border rounded text-white" required />
        <input type="number" placeholder="IMAP Port" value={form.imapPort}
          onChange={(e) => setForm({ ...form, imapPort: parseInt(e.target.value) })} className="w-full p-2 border rounded text-white" required />
        <input type="text" placeholder="IMAP Username" value={form.imapUser}
          onChange={(e) => setForm({ ...form, imapUser: e.target.value })} className="w-full p-2 border rounded text-white" required />

        <input type="text" placeholder="SMTP Host" value={form.smtpHost}
          onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} className="w-full p-2 border rounded text-white" required />
        <input type="number" placeholder="SMTP Port" value={form.smtpPort}
          onChange={(e) => setForm({ ...form, smtpPort: parseInt(e.target.value) })} className="w-full p-2 border rounded text-white" required />
        <input type="text" placeholder="SMTP Username" value={form.smtpUser}
          onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} className="w-full p-2 border rounded text-white" required />

        {/* Auth-specific fields */}
        {form.authType === "password" ? (
          <div>
            <label>App Password</label>
            <input type="password" placeholder="App Password" value={form.encryptedPass}
              onChange={(e) => setForm({ ...form, encryptedPass: e.target.value })} className="w-full p-2 border rounded text-white" required />
            <p className="text-sm text-gray-400 mt-1">
              Use an app password from your email provider's security settings.
            </p>
          </div>
        ) : (
          <>
            <input type="text" placeholder="OAuth Client ID" value={form.oauthClientId}
                onChange={(e) => setForm({ ...form, oauthClientId: e.target.value })} className="w-full p-2 border rounded text-white" required />
            <input type="text" placeholder="OAuth Client Secret" value={form.oauthClientSecret}
                onChange={(e) => setForm({ ...form, oauthClientSecret: e.target.value })} className="w-full p-2 border rounded text-white" required />
            {form.provider !== "outlook" && (
              <input type="text" placeholder="OAuth Refresh Token" value={form.refreshToken}
                  onChange={(e) => setForm({ ...form, refreshToken: e.target.value })} className="w-full p-2 border rounded text-white" required />
            )}
          </>
        )}

        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full" disabled={loading}>
          {loading ? "Adding..." : "Add Account"}
        </button>
      </form>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-700 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Confirm Logout</h3>
            <p className="mb-6">Are you sure you want to logout this email account?</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
              >
                Cancel
              </button>
              <button 
                onClick={logoutAccount}
                className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
                disabled={loading}
              >
                {loading ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
