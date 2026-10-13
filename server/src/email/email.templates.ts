import type { EmailContent } from './email.types';

const WEBSITE = 'https://idol-sg.com';
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',Arial,sans-serif";

/** All customer/store values must remain text, never executable email markup. */
function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character]!;
  });
}

function button(label: string, url: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;width:100%"><tr><td align="center" bgcolor="#e34b77" style="border-radius:12px;mso-padding-alt:16px 24px"><a href="${escapeHtml(url)}" style="display:block;padding:16px 24px;border:1px solid #e34b77;border-radius:12px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center">${escapeHtml(label)} <span aria-hidden="true">&rarr;</span></a></td></tr></table>`;
}

function layout(preheader: string, category: string, body: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(preheader)} · IDOL BEADS</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
    @media only screen and (max-width:480px){
      .outer{padding:20px 12px!important}.content{padding:24px 20px 28px!important}
      .brand{padding:24px 20px 0!important}.brand-logo{width:76px!important;height:76px!important}
      .title{font-size:25px!important}.code{font-size:30px!important;letter-spacing:4px!important}
      .detail-label{width:72px!important}.footer{padding:20px 14px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#fff6f9;color:#3d3037;font-family:${FONT}">
  <div style="display:none;font-size:1px;line-height:1px;color:#fff6f9;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fff6f9"><tr><td class="outer" align="center" style="padding:36px 16px">
    <!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px">
      <tr><td style="padding:0 0 14px;text-align:center;font-size:11px;font-weight:700;letter-spacing:2px;color:#997784">A LITTLE BEAD. A LOT OF JOY.</td></tr>
      <tr><td bgcolor="#ffffff" style="border:1px solid #f1dfe6;border-radius:22px;overflow:hidden">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr><td style="padding:0 20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="20%" height="5" bgcolor="#ff829e"></td><td width="20%" height="5" bgcolor="#ffc85a"></td><td width="20%" height="5" bgcolor="#99cc86"></td><td width="20%" height="5" bgcolor="#75cae9"></td><td width="20%" height="5" bgcolor="#c4a0d7"></td></tr></table></td></tr>
          <tr><td class="brand" style="padding:28px 36px 0">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
              <td width="104" valign="middle"><a href="${WEBSITE}" aria-label="IDOL BEADS 官网"><img class="brand-logo" src="cid:idol-beads-logo" width="88" height="88" alt="IDOL BEADS 店铺 Logo" style="display:block;width:88px;height:88px;border-radius:16px;background:#ffffff"></a></td>
              <td valign="middle" style="padding-left:12px"><div style="font-size:20px;line-height:28px;font-weight:800;letter-spacing:1px;color:#3d3037">IDOL BEADS</div><div style="margin-top:4px;font-size:13px;line-height:20px;color:#98747f">与快乐同行 · 拼豆工作室</div></td>
            </tr></table>
          </td></tr>
          <tr><td class="content" style="padding:28px 36px 32px">
            <div style="font-size:10px;line-height:16px;font-weight:700;letter-spacing:2px;color:#b24c6c">${escapeHtml(category)}</div>
            ${body}
          </td></tr>
          <tr><td style="padding:18px 24px;background-color:#fffaf0;border-top:1px solid #f6edda;text-align:center;font-size:13px;line-height:22px;color:#806844">一颗颗拼出喜欢，一点点收集快乐。</td></tr>
        </table>
      </td></tr>
      <tr><td class="footer" align="center" style="padding:24px 24px 8px;color:#8b737f;font-size:12px;line-height:21px">
        <strong style="color:#6b505e;letter-spacing:1px">IDOL BEADS · SINGAPORE</strong><br>
        新加坡拼豆工作室 · Perler Bead Workshop<br>
        <a href="${WEBSITE}" style="display:inline-block;margin-top:10px;color:#b24466;text-decoration:underline">idol-sg.com</a>
        <div style="margin-top:12px;font-size:11px;color:#927e86">本邮件由系统自动发送，请勿直接回复。</div>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr></table>
</body>
</html>`;
}

function codeCard(
  code: string,
  label: string,
  hint: string,
  booking = false,
): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px"><tr><td align="center" bgcolor="${booking ? '#fff8e5' : '#fff0f5'}" style="padding:22px 16px;border:1px solid ${booking ? '#f0dfa8' : '#f4d5e0'};border-radius:14px">
    <div style="font-size:12px;line-height:20px;color:#86626e">${escapeHtml(label)}</div>
    <div class="code" dir="ltr" style="margin:10px 0 8px;font-family:'Courier New',Courier,monospace;font-size:38px;line-height:48px;font-weight:700;letter-spacing:6px;color:#${booking ? '7c5a22' : 'b3345b'};white-space:nowrap">${escapeHtml(code)}</div>
    <div style="font-size:12px;line-height:20px;color:#886b77">${escapeHtml(hint)}</div>
  </td></tr></table>`;
}

export function registrationEmail(
  code: string,
  expiresInMinutes: number,
): EmailContent {
  const text = `IDOL BEADS · 拼豆工作室\n\n欢迎来到 IDOL BEADS！\n您的注册验证码是：${code}\n验证码 ${expiresInMinutes} 分钟内有效，请勿转发给他人。\n请回到注册页面输入验证码，完成账号注册。\n若非本人操作，请忽略本邮件。\n\n返回注册页面：${WEBSITE}/register\n新加坡拼豆工作室 · Perler Bead Workshop\n${WEBSITE}\n本邮件由系统自动发送，请勿直接回复。`;
  const html = layout(
    `欢迎加入 IDOL BEADS，您的注册验证码 ${expiresInMinutes} 分钟内有效。`,
    'WELCOME / EMAIL VERIFICATION',
    `<h1 class="title" style="margin:12px 0;font-size:29px;line-height:1.45;letter-spacing:-0.5px;color:#3d3037">欢迎来到你的拼豆小天地</h1>
    <p style="margin:0;font-size:15px;line-height:26px;color:#806c76">美好的创作，从这里开始。<br>在注册页面输入下方验证码，即可完成邮箱验证。</p>
    ${codeCard(code, '邮箱验证码 · VERIFICATION CODE', `${expiresInMinutes} 分钟内有效 · 请勿转发或分享`)}
    ${button('返回注册页面', `${WEBSITE}/register`)}
    <p style="margin:20px 0 0;font-size:12px;line-height:22px;color:#917d86">不是你发起的注册？请忽略这封邮件。<br>请勿向任何人透露验证码。</p>`,
  );
  return { text, html };
}

export function passwordResetEmail(
  code: string,
  expiresInMinutes: number,
): EmailContent {
  const text = `IDOL BEADS · 拼豆工作室\n\n我们收到了重置账号密码的请求。\n您的密码重置验证码是：${code}\n验证码 ${expiresInMinutes} 分钟内有效，请勿转发给他人。\n请回到找回密码页面输入验证码并设置新密码。\n若非本人操作，请忽略本邮件，原密码不会被修改。\n\n返回找回密码页面：${WEBSITE}/forgot-password\n新加坡拼豆工作室 · Perler Bead Workshop\n${WEBSITE}\n本邮件由系统自动发送，请勿直接回复。`;
  const html = layout(
    `您的密码重置验证码 ${expiresInMinutes} 分钟内有效。`,
    'ACCOUNT HELP / PASSWORD RESET',
    `<h1 class="title" style="margin:12px 0;font-size:29px;line-height:1.45;letter-spacing:-0.5px;color:#3d3037">重新回到你的拼豆小天地</h1>
    <p style="margin:0;font-size:15px;line-height:26px;color:#806c76">我们收到了重置密码的请求。<br>在找回密码页面输入下方验证码，即可设置新密码。</p>
    ${codeCard(code, '密码重置验证码 · RESET CODE', `${expiresInMinutes} 分钟内有效 · 请勿转发或分享`)}
    ${button('返回找回密码页面', `${WEBSITE}/forgot-password`)}
    <p style="margin:20px 0 0;font-size:12px;line-height:22px;color:#917d86">不是你发起的操作？请直接忽略这封邮件，原密码不会被修改。<br>请勿向任何人透露验证码。</p>`,
  );
  return { text, html };
}

export interface BookingEmailDetails {
  code: string;
  date: string;
  startTime: string;
  endTime: string;
  peopleCount: number;
  storeName: string;
  tableNames?: string[];
  packageName?: string;
  storeAddress?: string;
  phone?: string;
  siteUrl?: string;
  instagramUrl?: string;
  xiaohongshuUrl?: string;
}

export function bookingConfirmationEmail(
  details: BookingEmailDetails,
): EmailContent {
  const address = details.storeAddress?.trim();
  const tables = details.tableNames?.filter(Boolean).join('、');
  const siteUrl = (details.siteUrl || WEBSITE).replace(/\/$/, '');
  const instagramUrl =
    details.instagramUrl || 'https://www.instagram.com/idol_beads';
  const xiaohongshuUrl =
    details.xiaohongshuUrl ||
    'https://www.xiaohongshu.com/user/profile/650d5c8e00000000120075e5';
  const visitNotice =
    '时间或人数如有变化，请提前前往小红书联系 IDOL Beads 客服。预约时段最多保留 30 分钟。';
  const visitNoticeEn =
    'If your arrival time or party size changes, contact IDOL Beads on Xiaohongshu in advance. We can hold your slot for up to 30 minutes.';
  const rows: Array<[string, string]> = [
    ['预约日期', details.date],
    [
      '到店时间',
      `${details.startTime.slice(0, 5)} – ${details.endTime.slice(0, 5)}`,
    ],
    ['同行人数', `${details.peopleCount} 人`],
    ...(tables ? [['已选桌位', tables] as [string, string]] : []),
    ...(details.packageName
      ? [['体验套餐', details.packageName] as [string, string]]
      : []),
    ['预约门店', details.storeName],
    ...(address ? [['门店地址', address] as [string, string]] : []),
  ];
  const englishRows: Array<[string, string]> = [
    ['Date', details.date],
    [
      'Time',
      `${details.startTime.slice(0, 5)} – ${details.endTime.slice(0, 5)}`,
    ],
    ['Guests', String(details.peopleCount)],
    ...(tables ? [['Tables', tables] as [string, string]] : []),
    ...(details.packageName
      ? [['Package', details.packageName] as [string, string]]
      : []),
    ['Studio', details.storeName],
    ...(address ? [['Address', address] as [string, string]] : []),
  ];
  const contactText = `${details.phone ? `电话 / Phone: ${details.phone}\n` : ''}官网 / Website: ${siteUrl}\nInstagram: ${instagramUrl}\n小红书 / REDnote: ${xiaohongshuUrl}`;
  const text = `IDOL BEADS · 预约确认 / Booking Confirmed\n\n您的预约已确认，期待见到你！\n预约码：${details.code}\n${rows.map(([label, value]) => `${label}：${value}`).join('\n')}\n时间均为新加坡时间（UTC+8）。\n\n请妥善保存预约码，到店时出示。\n${visitNotice}\n查看我的预约：${siteUrl}/account\n未登录的顾客可使用预约时填写的邮箱查询。\n\nYour booking is confirmed.\nBooking code: ${details.code}\n${englishRows.map(([label, value]) => `${label}: ${value}`).join('\n')}\nAll times are in Singapore time (UTC+8).\nPlease keep your booking code and show it when you arrive.\n${visitNoticeEn}\nView your booking: ${siteUrl}/account\nNo sign-in needed. Use the email address from your booking.\n\n加入拼豆世界 / Join our bead community\n添加微信 IDOLBeads 并备注“加群”。\nAdd IDOLBeads on WeChat and send “Join group” to receive an invitation.\n复制微信号 / Copy WeChat ID: ${siteUrl}/wechat.html\n\n${contactText}\n本邮件由系统自动发送，请勿直接回复。\nThis is an automated email. Please do not reply directly.`;
  const detailRows = rows
    .map(
      ([label, value]) =>
        `<tr><td class="detail-label" valign="top" width="90" style="padding:10px 12px 10px 0;border-bottom:1px solid #f4edf0;font-size:13px;line-height:22px;color:#8b7380">${escapeHtml(label)}</td><td valign="top" style="padding:10px 0;border-bottom:1px solid #f4edf0;font-size:14px;line-height:22px;font-weight:600;color:#48343f;word-break:break-word;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  const html = layout(
    `${details.date} ${details.startTime.slice(0, 5)} 的预约已确认，期待你来到 IDOL BEADS。`,
    'SEE YOU SOON / BOOKING CONFIRMED',
    `<h1 class="title" style="margin:12px 0;font-size:29px;line-height:1.45;letter-spacing:-0.5px;color:#3d3037">你的快乐时光，已预留</h1>
    <p style="margin:0;font-size:15px;line-height:26px;color:#806c76"><strong style="color:#367659">预约已确认。</strong>带上灵感和好心情，<br>我们在 IDOL BEADS 等你，一起拼出喜欢的作品。</p>
    <p lang="en" style="margin:8px 0 0;font-size:14px;line-height:24px;color:#806c76"><strong>Your booking is confirmed.</strong> Your time slot is reserved. Please show the booking code below when you arrive.</p>
    ${codeCard(details.code, '到店预约码 · BOOKING CODE', '到店时向店员出示此预约码', true)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;table-layout:fixed">${detailRows}</table>
    <p style="margin:12px 0 0;font-size:11px;line-height:20px;color:#927c87">以上时间均为新加坡时间（UTC+8）。</p>
    <div lang="en" style="margin-top:12px;font-size:13px;line-height:22px;color:#806c76"><strong>Booking code: ${escapeHtml(details.code)}</strong><br>${englishRows.map(([label, value]) => `${escapeHtml(label)}: ${escapeHtml(value)}`).join('<br>')}<br>All times are in Singapore time (UTC+8).</div>
    <p style="margin:18px 0 0;padding:16px;background:#fff8e5;border-radius:12px;font-size:13px;line-height:22px;color:#806844"><strong>到店前请留意 · Before you visit</strong><br>${visitNotice}<br><span lang="en">${visitNoticeEn}</span></p>
    ${button('查看我的预约 · View my booking', `${siteUrl}/account`)}
    <p style="margin:12px 0 0;font-size:12px;line-height:22px;text-align:center;color:#907884">未登录？用预约时的邮箱即可查询。<br><span lang="en">No sign-in needed. Use the email address from your booking.</span></p>
    <div style="margin-top:24px;padding:18px;background:#fff6f9;border-radius:12px;font-size:13px;line-height:23px;color:#806c76"><strong>加入拼豆世界 · Join our bead community</strong><br>添加微信 IDOLBeads 并备注“加群”，认识拼豆同好、获取活动和空位消息。<br><span lang="en">Add IDOLBeads on WeChat and send “Join group” to meet fellow bead lovers and hear about events or available slots.</span><br><a href="${escapeHtml(siteUrl)}/wechat.html" style="color:#b24466">微信 IDOLBeads · 复制 / Copy</a></div>
    <p style="margin:18px 0 0;font-size:12px;line-height:22px;text-align:center;color:#907884">${details.phone ? `电话 / Phone: ${escapeHtml(details.phone)}<br>` : ''}<a href="${escapeHtml(siteUrl)}" style="color:#b24466">官网 / Website</a> · <a href="${escapeHtml(instagramUrl)}" style="color:#b24466">Instagram</a> · <a href="${escapeHtml(xiaohongshuUrl)}" style="color:#b24466">小红书 / REDnote</a></p>
    ${address ? `<p style="margin:18px 0 0;text-align:center;font-size:13px;line-height:22px"><a href="https://www.google.com/maps/search/?api=1&amp;query=${escapeHtml(encodeURIComponent(address))}" style="color:#b24466;text-decoration:underline">查看门店位置 &rarr;</a></p>` : ''}`,
  );
  return { text, html };
}
