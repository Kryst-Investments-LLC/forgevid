const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();
const HOUR = 60 * 60 * 1000;
const APP_URL = process.env.NEXTAUTH_URL || 'https://www.forgevid.com';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function alreadySent(userId, action) {
  return Boolean(await prisma.usageRecord.findFirst({ where: { userId, action } }));
}

async function sendOnce(user, action, subject, body, cta, href) {
  if (!user.email || await alreadySent(user.id, action)) return;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px">
    <h1 style="color:#22d3ee">ForgeVid</h1><p>Hi ${String(user.name || 'there').replace(/[<>&"]/g, '')},</p>
    <p style="line-height:1.6">${body}</p>
    <p><a href="${APP_URL}${href}" style="display:inline-block;background:#0891b2;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">${cta}</a></p>
    <p style="font-size:12px;color:#94a3b8">Nothing is published or sent to prospects without your review. Manage communications in <a style="color:#22d3ee" href="${APP_URL}/dashboard/settings">Settings</a>.</p>
  </div>`;
  await transporter.sendMail({ from: process.env.SMTP_FROM || 'ForgeVid <noreply@forgevid.com>', to: user.email, subject, html });
  await prisma.usageRecord.create({
    data: { userId: user.id, action, resourceType: 'lifecycle_email', quantity: 1, metadata: JSON.stringify({ subject, sentAt: new Date().toISOString() }) },
  });
}

async function runLifecycle() {
  const inactiveCutoff = new Date(Date.now() - 24 * HOUR);
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true, email: true, name: true, createdAt: true,
      _count: { select: { videos: true } },
      videos: {
        where: { exports: { some: { status: 'COMPLETED' } } },
        select: { id: true },
        take: 3,
      },
    },
  });

  for (const user of users) {
    if (user.createdAt <= inactiveCutoff && user._count.videos === 0) {
      await sendOnce(user, 'activation_email_sent', 'Your first ForgeVid video is waiting',
        'Start with a template or paste an inventory feed. Your free account includes a guided first creation.',
        'Create my first video', '/dashboard/templates');
    }
    if (user.videos.length >= 1) {
      await sendOnce(user, 'first_export_followup_sent', 'Three ways to reuse your first ForgeVid export',
        'Create a Spanish variation, share its template link, or turn an inventory feed into the next batch.',
        'Create the next variation', '/dashboard/videos');
    }
    if (user.videos.length >= 3) {
      await sendOnce(user, 'testimonial_request_sent', 'How is ForgeVid working for you?',
        'You have completed multiple exports. Would you share a short, honest testimonial? We will never publish your name or feedback without your explicit permission.',
        'Share feedback', '/dashboard/testimonial');
    }
  }
  console.log('[Growth] Lifecycle scan complete.');
}

async function tick() {
  try { await runLifecycle(); } catch (error) { console.error('[Growth] Lifecycle scan failed:', error); }
}

tick();
setInterval(tick, 6 * HOUR);
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });
