import {
  isSingaporePublicHoliday,
  isSurchargeDate,
} from './singapore-holidays';

describe('singapore-holidays', () => {
  it('识别 2026 年公共假期与周日补假', () => {
    expect(isSingaporePublicHoliday('2026-08-09')).toBe(true); // 国庆日（周日）
    expect(isSingaporePublicHoliday('2026-08-10')).toBe(true); // 国庆日补假（周一）
    expect(isSingaporePublicHoliday('2026-02-17')).toBe(true); // 农历新年
    expect(isSingaporePublicHoliday('2026-12-25')).toBe(true); // 圣诞节
  });

  it('非假期返回 false', () => {
    expect(isSingaporePublicHoliday('2026-08-11')).toBe(false);
    expect(isSingaporePublicHoliday('2026-06-15')).toBe(false);
  });

  it('周末加价：周六/周日触发，工作日不触发', () => {
    expect(isSurchargeDate('2026-08-08')).toBe(true); // 周六
    expect(isSurchargeDate('2026-08-09')).toBe(true); // 周日（同时是假期）
    expect(isSurchargeDate('2026-08-11')).toBe(false); // 周二
  });

  it('工作日但逢公共假期（补假）也触发加价', () => {
    expect(isSurchargeDate('2026-08-10')).toBe(true); // 周一，国庆日补假
    expect(isSurchargeDate('2026-11-09')).toBe(true); // 周一，屠妖节补假
  });

  it('2027 年数据可用', () => {
    expect(isSingaporePublicHoliday('2027-02-06')).toBe(true);
    expect(isSingaporePublicHoliday('2027-12-25')).toBe(true);
  });
});
