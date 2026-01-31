import webPush from "../../push.js";
import prisma from "../prismaClient.js";


export async function sendPushToUser(userId, payload) {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (!subs.length) return;

  await Promise.all(
    subs.map((sub) =>
      webPush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        )
        .catch(async (err) => {
          // Remove expired subscriptions
          if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { endpoint: sub.endpoint },
            });
          }
        })
    )
  );
}
