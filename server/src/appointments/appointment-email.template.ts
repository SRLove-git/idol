type AppointmentEmailDetails = {
  code: string;
  date: string;
  startTime: string;
  endTime: string;
  peopleCount: number;
  storeName: string;
};

type AppointmentEmailOptions = {
  heading: string;
  headingEn: string;
  intro: string;
  introEn: string;
  appointment: AppointmentEmailDetails;
  reason?: string;
  reasonEn?: string;
  reasonLabel?: string;
  reasonLabelEn?: string;
  closingNote?: string;
  closingNoteEn?: string;
  visitNotice?: string;
  visitNoticeEn?: string;
  address?: string;
  phone?: string;
  siteUrl?: string;
  instagramUrl?: string;
  xiaohongshuUrl?: string;
  actionLabel?: string;
  actionLabelEn?: string;
  wechatId?: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[char] ?? char,
  );
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #eee9e7;color:#998c8f;font-size:13px;vertical-align:top;width:90px;">${escapeHtml(label)}</td>
    <td style="padding:12px 0;border-bottom:1px solid #eee9e7;color:#443b3e;font-size:14px;font-weight:700;vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;
}

/** 预约状态邮件：使用邮件客户端兼容的表格与内联样式。 */
export function buildAppointmentEmailHtml(
  options: AppointmentEmailOptions,
): string {
  const siteUrl = (options.siteUrl || 'https://idol-sg.com').replace(/\/$/, '');
  const logoUrl = `${siteUrl}/photos/idol-logo.png`;
  const instagramUrl =
    options.instagramUrl || 'https://www.instagram.com/idol_beads';
  const xiaohongshuUrl =
    options.xiaohongshuUrl ||
    'https://www.xiaohongshu.com/user/profile/650d5c8e00000000120075e5';
  const wechatId = options.wechatId || 'IDOLBeads';
  const copyWechatUrl = `${siteUrl}/wechat.html`;
  const appt = options.appointment;
  const contactRows = [
    options.address ? `📍 ${escapeHtml(options.address)}` : '',
    options.phone ? `📞 ${escapeHtml(options.phone)}` : '',
  ].filter(Boolean);

  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f2f0;font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#40383a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f2f0;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #e9e2df;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #eee8e5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
            <td style="padding-right:14px;"><img src="${escapeHtml(logoUrl)}" width="58" height="58" alt="IDOL BEADS" style="display:block;width:58px;height:58px;border-radius:50%;object-fit:cover;border:1px solid #eee4e1;"></td>
            <td><div style="color:#ee728f;font-size:19px;font-weight:800;letter-spacing:1.5px;">IDOL BEADS</div><div style="margin-top:4px;color:#9a8d90;font-size:11px;letter-spacing:1px;">DIY BEAD WORKSHOP</div></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:36px 40px 32px;">
          <div style="color:#c45d76;font-size:12px;font-weight:700;letter-spacing:1px;">预约状态通知 · BOOKING UPDATE</div>
          <h1 style="margin:8px 0 12px;color:#3f3739;font-size:26px;line-height:1.35;">${escapeHtml(options.heading)}</h1>
          <div style="margin:-5px 0 17px;color:#74686b;font-size:17px;font-weight:700;line-height:1.45;">${escapeHtml(options.headingEn)}</div>
          <p style="margin:0;color:#766b6e;font-size:15px;line-height:1.8;">${escapeHtml(options.intro)}</p>
          <p style="margin:5px 0 26px;color:#8d8184;font-size:14px;line-height:1.7;">${escapeHtml(options.introEn)}</p>
          ${
            options.reason
              ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:22px;background:#fff5f6;border-left:3px solid #ee7b96;border-radius:4px 12px 12px 4px;"><tr><td style="padding:17px 18px;"><div style="color:#a45a6b;font-size:12px;font-weight:700;">${escapeHtml(options.reasonLabel || '预约变更原因')} · ${escapeHtml(options.reasonLabelEn || 'Reason for the booking update')}</div><div style="margin-top:7px;color:#514649;font-size:15px;line-height:1.65;">${escapeHtml(options.reason)}</div>${options.reasonEn ? `<div style="margin-top:4px;color:#75696c;font-size:13px;line-height:1.65;">${escapeHtml(options.reasonEn)}</div>` : ''}</td></tr></table>`
              : ''
          }
          ${
            options.closingNote
              ? `<p style="margin:0;color:#675b5e;font-size:14px;line-height:1.8;">${escapeHtml(options.closingNote)}</p>${options.closingNoteEn ? `<p style="margin:4px 0 26px;color:#887c7f;font-size:13px;line-height:1.7;">${escapeHtml(options.closingNoteEn)}</p>` : '<div style="height:26px;"></div>'}`
              : ''
          }
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e8e2df;">
            ${detailRow('预约码 / Booking code', appt.code)}
            ${detailRow('日期 / Date', appt.date)}
            ${detailRow('时间 / Time', `${appt.startTime} – ${appt.endTime}`)}
            ${detailRow('人数 / Guests', `${appt.peopleCount} 人 / ${appt.peopleCount} ${appt.peopleCount === 1 ? 'guest' : 'guests'}`)}
            ${detailRow('门店 / Studio', appt.storeName)}
          </table>
          ${
            options.visitNotice
              ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;background:#fff8e8;border:1px solid #f1dba2;border-radius:12px;"><tr><td style="padding:18px 20px;"><div style="color:#7a5b19;font-size:14px;font-weight:800;">到店前请留意 · Before you visit</div><div style="margin-top:8px;color:#665b43;font-size:13px;line-height:1.75;">${escapeHtml(options.visitNotice)}</div>${options.visitNoticeEn ? `<div style="margin-top:5px;color:#85775b;font-size:12px;line-height:1.7;">${escapeHtml(options.visitNoticeEn)}</div>` : ''}</td></tr></table>`
              : ''
          }
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding-top:28px;">
            <a href="${escapeHtml(siteUrl)}" style="display:inline-block;padding:13px 28px;border-radius:999px;background:#ee7894;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(options.actionLabel || '访问 IDOL BEADS')} · ${escapeHtml(options.actionLabelEn || 'Visit IDOL BEADS')}</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:0 40px 36px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8f5f3;border-radius:14px;"><tr><td style="padding:24px;">
            <div style="color:#473e40;font-size:17px;font-weight:800;">加入拼豆世界 <span style="color:#8d8184;font-size:14px;">· Join our bead community</span></div>
            <div style="margin-top:9px;color:#756a6d;font-size:13px;line-height:1.8;">想认识更多拼豆同好、获取活动和空位消息？添加下方微信并备注“加群”，由 ${escapeHtml(wechatId)} 邀请你加入群聊。</div>
            <div style="margin-top:5px;color:#8d8184;font-size:12px;line-height:1.7;">Meet fellow bead lovers and hear about events or available slots. Add us on WeChat and send “Join group”; ${escapeHtml(wechatId)} will invite you to the group chat.</div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:14px;"><tr>
              <td style="padding:10px 13px;background:#ffffff;border:1px solid #ded6d3;border-radius:8px 0 0 8px;color:#40383a;font-size:14px;font-weight:800;">微信号 / WeChat：${escapeHtml(wechatId)}</td>
              <td><a href="${escapeHtml(copyWechatUrl)}" style="display:block;padding:11px 13px;border-radius:0 8px 8px 0;background:#ee7894;color:#ffffff;font-size:12px;font-weight:800;text-decoration:none;">复制 / Copy</a></td>
            </tr></table>
          </td></tr></table>
        </td></tr>
        <tr><td align="center" style="padding:22px 32px 25px;background:#302b2c;color:#d8cfd1;">
          ${contactRows.map((row) => `<div style="color:#d8cfd1;font-size:12px;line-height:1.8;">${row}</div>`).join('')}
          <div style="color:#d8cfd1;font-size:12px;line-height:1.8;">微信 / WeChat ${escapeHtml(wechatId)}</div>
          <div style="margin-top:5px;font-size:12px;line-height:1.8;">
            <a href="${escapeHtml(siteUrl)}" style="color:#ffb3c5;text-decoration:none;">官网 / Website</a>
            <span style="color:#766d70;"> &nbsp;·&nbsp; </span>
            <a href="${escapeHtml(instagramUrl)}" style="color:#ffb3c5;text-decoration:none;">Instagram @idol_beads</a>
            <span style="color:#766d70;"> &nbsp;·&nbsp; </span>
            <a href="${escapeHtml(xiaohongshuUrl)}" style="color:#ffb3c5;text-decoration:none;">小红书 / REDnote IDOL Beads</a>
          </div>
          <div style="margin-top:10px;color:#92888a;font-size:10px;line-height:1.6;">此邮件由 IDOL BEADS 预约系统自动发送，请勿直接回复。<br>This is an automated email from IDOL BEADS. Please do not reply directly.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
