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
  intro: string;
  appointment: AppointmentEmailDetails;
  reason?: string;
  address?: string;
  phone?: string;
  siteUrl?: string;
  instagramUrl?: string;
  xiaohongshuUrl?: string;
  actionLabel?: string;
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
    <td style="padding:10px 0;color:#8b7b80;font-size:13px;vertical-align:top;width:86px;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;color:#493e42;font-size:14px;font-weight:700;vertical-align:top;">${escapeHtml(value)}</td>
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
  const appt = options.appointment;
  const contactRows = [
    options.address ? `📍 ${escapeHtml(options.address)}` : '',
    options.phone ? `📞 ${escapeHtml(options.phone)}` : '',
  ].filter(Boolean);

  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f4f5;font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#493e42;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8f4f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #f0dfe4;border-radius:22px;overflow:hidden;box-shadow:0 16px 44px rgba(93,57,68,.08);">
        <tr><td align="center" style="padding:30px 28px 24px;background:linear-gradient(135deg,#fff4f7,#fffaf0);border-bottom:1px solid #f5e5e9;">
          <img src="${escapeHtml(logoUrl)}" width="82" height="82" alt="IDOL BEADS" style="display:block;width:82px;height:82px;border-radius:50%;object-fit:cover;border:4px solid #ffffff;box-shadow:0 8px 22px rgba(220,102,132,.18);">
          <div style="margin-top:13px;color:#ef7693;font-size:22px;font-weight:800;letter-spacing:2px;">IDOL BEADS</div>
          <div style="margin-top:5px;color:#a89399;font-size:11px;letter-spacing:1.5px;">DIY BEAD WORKSHOP</div>
        </td></tr>
        <tr><td style="padding:34px 34px 30px;">
          <h1 style="margin:0;color:#44383c;font-size:25px;line-height:1.4;">${escapeHtml(options.heading)}</h1>
          <p style="margin:12px 0 24px;color:#75666b;font-size:15px;line-height:1.8;">${escapeHtml(options.intro)}</p>
          ${
            options.reason
              ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:22px;background:#fff2f5;border:1px solid #f4ccd6;border-radius:14px;"><tr><td style="padding:16px 18px;"><div style="color:#bb536d;font-size:12px;font-weight:800;letter-spacing:.5px;">拒绝/取消原因</div><div style="margin-top:7px;color:#5d474e;font-size:15px;line-height:1.65;">${escapeHtml(options.reason)}</div></td></tr></table>`
              : ''
          }
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:8px 20px;background:#fbfaf9;border:1px solid #eee8e9;border-radius:14px;">
            ${detailRow('预约码', appt.code)}
            ${detailRow('日期', appt.date)}
            ${detailRow('时间', `${appt.startTime} – ${appt.endTime}`)}
            ${detailRow('人数', `${appt.peopleCount} 人`)}
            ${detailRow('门店', appt.storeName)}
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding-top:26px;">
            <a href="${escapeHtml(siteUrl)}" style="display:inline-block;padding:13px 25px;border-radius:999px;background:#ef7895;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;">${escapeHtml(options.actionLabel || '访问 IDOL BEADS')}</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:24px 34px;background:#2d292a;color:#ffffff;">
          <div style="font-size:13px;font-weight:800;letter-spacing:.8px;">联系 IDOL BEADS</div>
          ${contactRows.map((row) => `<div style="margin-top:10px;color:#d9ced1;font-size:12px;line-height:1.6;">${row}</div>`).join('')}
          <div style="margin-top:12px;font-size:12px;line-height:1.8;">
            <a href="${escapeHtml(siteUrl)}" style="color:#ffb3c5;text-decoration:none;">官网</a>
            <span style="color:#766d70;"> &nbsp;·&nbsp; </span>
            <a href="${escapeHtml(instagramUrl)}" style="color:#ffb3c5;text-decoration:none;">Instagram @idol_beads</a>
            <span style="color:#766d70;"> &nbsp;·&nbsp; </span>
            <a href="${escapeHtml(xiaohongshuUrl)}" style="color:#ffb3c5;text-decoration:none;">小红书 IDOL Beads</a>
          </div>
          <div style="margin-top:18px;color:#8f8588;font-size:10px;line-height:1.6;">此邮件由 IDOL BEADS 预约系统自动发送。</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
