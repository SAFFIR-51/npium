const nodemailer = require('nodemailer');
const { randomUUID, createHash } = require('node:crypto');

const fields = new Set(['미디어·콘텐츠 제작', '마케팅', '문화 행사·페스티벌', '기타 파트너십']);
const origins = new Set(['https://npium.vercel.app', 'https://npium.saffirdev.com']);
const recent = new Map(); // Best-effort warm-instance throttling, not a shared rate-limit store.
const completed = new Map();
let transporter;
function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
function escapeHtml(text) { return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
async function readBody(req) {
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > 16384) throw new Error('too-large');
    return typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(raw);
  }
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw new Error('too-large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { success: false, message: '지원하지 않는 요청입니다.' });
  const origin = req.headers.origin;
  const local = !process.env.VERCEL && ['http://127.0.0.1:4173', 'http://localhost:4173'].includes(origin);
  if (!origins.has(origin) && !local) return reply(res, 403, { success: false, message: '사이트에서 다시 문의해 주세요.' });
  if (!(req.headers['content-type'] || '').startsWith('application/json')) return reply(res, 415, { success: false, message: '요청 형식이 올바르지 않습니다.' });
  let data;
  try { data = await readBody(req); }
  catch (error) { return reply(res, error.message === 'too-large' ? 413 : 400, { success: false, message: '문의 내용을 확인해 주세요.' }); }
  if (!data || Array.isArray(data) || typeof data !== 'object') return reply(res, 400, { success: false, message: '요청이 올바르지 않습니다.' });
  const text = key => typeof data[key] === 'string' ? data[key].trim() : '';
  const name = text('name'), email = text('email'), company = text('company'), field = text('field'), message = text('message');
  if (text('website') || !name || name.length > 80 || /[\r\n\u0000]/.test(name + email + company) || company.length > 120 || email.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) || !fields.has(field) || message.length < 10 || message.length > 3000 || data.consent !== true) {
    return reply(res, 400, { success: false, message: '이름, 이메일, 문의 분야와 내용 및 동의 항목을 확인해 주세요.' });
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return reply(res, 503, { success: false, message: '메일 연결을 준비 중입니다. 잠시 후 다시 시도해 주세요.' });
  const now = Date.now();
  for (const [key, entry] of recent) if (now - entry.start > 900000) recent.delete(key);
  for (const [key, entry] of completed) if (now - entry.at > 900000) completed.delete(key);
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const fingerprint = createHash('sha256').update(JSON.stringify([ip, name, email, company, field, message])).digest('hex');
  if (completed.has(fingerprint)) return reply(res, 200, { success: true, reference: completed.get(fingerprint).reference });
  const limit = recent.get(ip) || { count: 0, start: now };
  if (limit.count >= 3) return reply(res, 429, { success: false, message: '문의가 여러 번 접수되었습니다. 잠시 후 다시 시도해 주세요.' });
  limit.count++; recent.set(ip, limit);
  const reference = randomUUID().slice(0, 8).toUpperCase();
  const receivedAt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const values = [['접수 번호', reference], ['접수 시각', receivedAt], ['문의 분야', field], ['이름', name], ['회사 / 기관', company || '미입력'], ['회신 이메일', email]];
  const plain = values.map(([label, value]) => `${label}: ${value}`).join('\n') + '\n\n문의 내용\n' + message + '\n\n개인정보 수집·전송 동의: 확인\n접수 사이트: ' + origin;
  const html = `<div style="font-family:Arial,sans-serif;background:#f3eef8;padding:32px;color:#2e203b"><div style="max-width:640px;margin:auto;background:#fff;padding:32px;border-radius:16px"><p style="color:#895ba7;font-size:12px">nPIUM · PROJECT INQUIRY</p><h1 style="font-size:25px">새로운 프로젝트 문의</h1><table style="border-collapse:collapse;width:100%">${values.map(([label, value]) => `<tr><th style="padding:12px 0;text-align:left;border-bottom:1px solid #eee;color:#806d8d;font-size:12px;min-width:100px">${label}</th><td style="padding:12px;border-bottom:1px solid #eee;font-size:14px">${escapeHtml(value)}</td></tr>`).join('')}</table><h2 style="font-size:16px;margin-top:28px">문의 내용</h2><p style="white-space:pre-wrap;line-height:1.8">${escapeHtml(message)}</p><p style="font-size:11px;color:#897991">개인정보 수집·전송 동의 확인 · ${escapeHtml(origin)}<br>메일의 답장 버튼으로 문의자에게 회신할 수 있습니다.</p></div></div>`;
  try {
    transporter ||= nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 });
    const info = await transporter.sendMail({ from: { name: 'nPIUM 웹사이트', address: process.env.SMTP_USER }, to: process.env.INQUIRY_TO || process.env.SMTP_USER, replyTo: { name, address: email }, subject: `[nPIUM 프로젝트 문의] ${field} / ${name}`, text: plain, html, disableFileAccess: true, disableUrlAccess: true });
    if (!info.accepted?.length) throw new Error('not-accepted');
    completed.set(fingerprint, { reference, at: now });
    return reply(res, 200, { success: true, reference });
  } catch (error) {
    console.error('inquiry_email_failed', { code: error.code || 'SEND_FAILED', responseCode: error.responseCode || null });
    return reply(res, 502, { success: false, message: '문의 전송을 완료하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.' });
  }
};
