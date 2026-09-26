import { randomInt } from 'crypto';

/**
 * 核销码字符集：大写字母 + 数字。
 * 去掉易混淆的 0/O、1/I（以及形近的 L），店员口头报码、顾客手动输入都不易出错。
 */
export const REDEEM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const LETTER_RE = /[A-Z]/;
const DIGIT_RE = /\d/;

/**
 * 生成 6 位核销码（数字 + 大写字母混合，至少包含 1 个字母和 1 个数字）。
 * 唯一性由数据库唯一索引兜底，调用方负责冲突重试。
 */
export function generateRedeemCode(length = 6): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += REDEEM_CODE_ALPHABET[randomInt(REDEEM_CODE_ALPHABET.length)];
    }
    // 与用户约定一致：核销码必须数字 + 字母混合，纯数字/纯字母不算
    if (LETTER_RE.test(code) && DIGIT_RE.test(code)) return code;
  }
  throw new Error('核销码生成失败，请重试');
}

/** 用户输入的核销码统一转大写，避免大小写不一致查不到记录 */
export function normalizeRedeemCode(code: string): string {
  return code.trim().toUpperCase();
}
