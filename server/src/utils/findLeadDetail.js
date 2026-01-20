export async function findLeadDetailId(
  prisma,
  { fromEmail, toEmail, ccEmail }
) {
  const emails = [];

  if (fromEmail) emails.push(fromEmail.toLowerCase());

  if (toEmail) {
    toEmail.split(",").forEach((e) => emails.push(e.trim().toLowerCase()));
  }

  if (ccEmail) {
    ccEmail.split(",").forEach((e) => emails.push(e.trim().toLowerCase()));
  }

  if (emails.length === 0) return null;

  const lead = await prisma.leadDetails.findFirst({
    where: {
      OR: [{ email: { in: emails } }, { cc: { in: emails } }],
    },
    select: { id: true },
  });

  return lead?.id || null;
}
