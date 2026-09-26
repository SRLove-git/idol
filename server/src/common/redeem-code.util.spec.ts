import { generateRedeemCode, normalizeRedeemCode } from './redeem-code.util';

describe('redeem-code.util', () => {
  describe('generateRedeemCode', () => {
    it('生成 6 位数字+字母混合码（至少 1 个字母和 1 个数字）', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateRedeemCode();
        expect(code).toMatch(/^[A-Z0-9]{6}$/);
        expect(code).toMatch(/[A-Z]/);
        expect(code).toMatch(/\d/);
      }
    });

    it('自定义长度生效', () => {
      expect(generateRedeemCode(8)).toHaveLength(8);
    });
  });

  describe('normalizeRedeemCode', () => {
    it('小写与首尾空格统一转大写', () => {
      expect(normalizeRedeemCode(' ab12cd ')).toBe('AB12CD');
    });
  });
});
