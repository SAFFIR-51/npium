const test = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
let fail = false; const sent = [];
nodemailer.createTransport = () => ({ sendMail: async mail => { if (fail) throw Object.assign(new Error('SMTP failure'), { code: 'EAUTH', responseCode: 535 }); sent.push(mail); return { accepted: ['inbox@example.com'] }; } });
process.env.SMTP_USER = 'sender@example.com';
process.env.SMTP_PASSWORD = 'test-only-value';
process.env.INQUIRY_TO = 'inbox@example.com';
process.env.VERCEL = '1';
const handler = require('../api/inquiry.js');
const valid = { name: '테스트 문의자', email: 'reply@example.com', company: '샘플 회사', field: '마케팅', message: '웹사이트의 프로젝트 문의 전송을 확인합니다.', consent: true, website: '' };
async function request(body = valid, options = {}) {
 let status, data;
 const req = { method: options.method || 'POST', headers: { origin: options.origin || 'https://npium.vercel.app', 'content-type': 'application/json', 'x-vercel-forwarded-for': options.ip || 'test-client' }, body };
 const res = { writeHead(code) { status = code; }, end(text) { data = JSON.parse(text); } };
 await handler(req, res); return { status, data };
}
test('rejects wrong method and foreign origins before attempting email', async () => {
 assert.equal((await request(valid, { method: 'GET' })).status, 405);
 assert.equal((await request(valid, { origin: 'https://unrelated.example' })).status, 403);
 assert.equal(sent.length, 0);
});
test('validates consent, email header injection, honeypot and message size', async () => {
 for (const change of [{ consent: false }, { email: 'reply@example.com\r\nBcc:other@example.com' }, { website: 'bot' }, { message: 'short' }, { message: 'a'.repeat(3001) }]) assert.equal((await request({ ...valid, ...change })).status, 400);
 assert.equal(sent.length, 0);
});
test('sends only to configured recipient with sender and reply-to separated', async () => {
 const result = await request({ ...valid, message: '문의 내용 <script>alert(1)</script> 확인' });
 assert.equal(result.status, 200); assert.equal(result.data.success, true); assert.match(result.data.reference, /^[A-F0-9]{8}$/);
 const mail = sent.at(-1); assert.equal(mail.to, 'inbox@example.com'); assert.equal(mail.from.address, 'sender@example.com'); assert.equal(mail.replyTo.address, valid.email);
 assert.ok(mail.html.includes('&lt;script&gt;')); assert.ok(!mail.html.includes('<script>')); assert.equal(mail.disableFileAccess, true);
});
test('does not resend an identical warm-instance submission', async () => {
 const before = sent.length; await request(valid, { ip: 'duplicate-client' }); await request(valid, { ip: 'duplicate-client' }); assert.equal(sent.length - before, 1);
});
test('limits repeated distinct requests in a warm instance', async () => {
 for (let i = 0; i < 3; i++) assert.equal((await request({ ...valid, message: valid.message + i }, { ip: 'rate-client' })).status, 200);
 assert.equal((await request({ ...valid, message: valid.message + 'fourth' }, { ip: 'rate-client' })).status, 429);
});
test('reports SMTP failure instead of false success or exposing credentials', async () => {
 fail = true; const result = await request(valid, { ip: 'failure-client' }); fail = false;
 assert.equal(result.status, 502); assert.equal(result.data.success, false); assert.ok(!JSON.stringify(result).includes('test-only-value'));
});
