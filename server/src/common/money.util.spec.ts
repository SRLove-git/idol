import {
  centsToYuan,
  percentOffCents,
  roundMoney,
  yuanToCents,
} from './money.util';

describe('money.util', () => {
  it('元转分：number 与字符串一致，四舍五入到整数分', () => {
    expect(yuanToCents(39.9)).toBe(3990);
    expect(yuanToCents('39.9')).toBe(3990);
    expect(yuanToCents('39.90')).toBe(3990);
    expect(yuanToCents('0.01')).toBe(1);
    expect(yuanToCents('0')).toBe(0);
    expect(yuanToCents(19.995)).toBe(2000);
  });

  it('分转元：保留 2 位小数', () => {
    expect(centsToYuan(3990)).toBe(39.9);
    expect(centsToYuan(1)).toBe(0.01);
    expect(centsToYuan(0)).toBe(0);
  });

  it('百分比折扣用整数分计算，8.8 折抵扣 12%', () => {
    // $39.90 打 8.8 折 → 抵扣 12% = $4.788 → 四舍五入 $4.79
    expect(percentOffCents(3990, 8.8)).toBe(479);
  });

  it('百分比折扣边界：0 折全免、10 折不抵扣', () => {
    expect(percentOffCents(3990, 0)).toBe(3990);
    expect(percentOffCents(3990, 10)).toBe(0);
  });

  it('浮点折扣（如 7.5 折）不产生精度误差', () => {
    // $100.00 打 7.5 折 → 抵扣 25% = $25.00
    expect(percentOffCents(10000, 7.5)).toBe(2500);
  });

  it('roundMoney 兼容旧调用', () => {
    expect(roundMoney(19.900000000000002)).toBe(19.9);
  });
});
