"use client";

import EmailModal from "../client/src/pages/components/EmailModal";

export default function SyntheticV0PageForDeployment() {
  return (
    <EmailModal
      isOpen={true}
      onClose={() => {}}
      emailData={{
        fromEmail: "",
        emailAccounts: [],
        newEmail: "",
        sendGridApiKey: "",
        to: "",
        cc: "",
        subject: "",
        body: "",
        addRegards: false,
        mode: "gmail",
      }}
      handleEmailChange={() => {}}
      handleSendEmail={() => {}}
      user={{ name: "User" }}
      selectedEmailLead={null}
    />
  );
}
