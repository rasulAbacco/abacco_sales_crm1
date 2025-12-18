import { createImapClient } from "./imapClient.js";
import { syncFolder } from "./syncFolder.js";

export async function syncAccount(prisma, account) {
  const client = createImapClient(account);

  await client.connect();

  const folders = ["INBOX", "Sent"];

  for (const folder of folders) {
    await syncFolder(client, prisma, account, folder);
  }

  await client.logout();
}
