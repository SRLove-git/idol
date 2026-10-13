import { bookingConfirmationEmail, registrationEmail } from './email.templates';

describe('branded transaction emails', () => {
  it('keeps the same registration code and expiry in both alternatives without adding it to links', () => {
    const email = registrationEmail('123456', 7);

    expect(email.text).toContain('123456');
    expect(email.html).toContain('123456');
    expect(email.text).toContain('7 分钟内有效');
    expect(email.html).toContain('7 分钟内有效');
    expect(email.html).toContain('src="cid:idol-beads-logo"');
    expect(email.html).toContain('href="https://idol-sg.com/register"');
    expect(email.html).not.toMatch(/href="[^"]*123456/);
  });

  it('escapes stored booking values and preserves seat information and Singapore time', () => {
    const email = bookingConfirmationEmail({
      code: 'ABC123',
      date: '2026-10-11',
      startTime: '10:00:00',
      endTime: '12:00:00',
      peopleCount: 2,
      storeName: 'Studio <img src=x onerror=alert(1)>',
      tableNames: ['A1', 'B2 & Friends'],
      packageName: 'DIY <script>alert(1)</script>',
      storeAddress: '18A Sago Street, Singapore 059017',
    });

    expect(email.text).toContain('已选桌位：A1、B2 & Friends');
    expect(email.html).toContain('A1、B2 &amp; Friends');
    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<img src=x');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('10:00 – 12:00');
    expect(email.text).toContain('新加坡时间（UTC+8）');
    expect(email.html).toContain('href="https://idol-sg.com/account"');
    expect(email.html).not.toMatch(/href="[^"]*ABC123/);
  });

  it('omits unavailable optional booking fields instead of displaying undefined', () => {
    const email = bookingConfirmationEmail({
      code: 'BOOK01',
      date: '2026-10-11',
      startTime: '10:00',
      endTime: '11:00',
      peopleCount: 1,
      storeName: 'IDOL BEADS',
    });
    expect(email.text).not.toContain('已选桌位');
    expect(email.text).not.toContain('体验套餐');
    expect(email.html).not.toContain('undefined');
    expect(email.text).not.toContain('门店地址');
    expect(email.html).not.toContain('google.com/maps');
  });
});
