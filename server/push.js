import webPush from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

// 🛡️ Safety check to prevent crashing the server
if (!publicKey || !privateKey) {
  console.warn(
    "⚠️ Web Push VAPID keys are missing. Push notifications will be disabled."
  );
} else {
  webPush.setVapidDetails(
    "mailto:xemail.test.2025@gmail.com",
    publicKey,
    privateKey
  );
}

export default webPush;
