import { resolveLocale, translateError, translateErrors } from './i18n';

describe('i18n', () => {
  it('按 Accept-Language 解析英文', () => {
    expect(resolveLocale('en-US,en;q=0.9')).toBe('en');
    expect(resolveLocale('zh-CN,zh;q=0.9')).toBe('zh');
    expect(resolveLocale(undefined, 'en')).toBe('en');
    expect(resolveLocale('fr-FR')).toBe('zh');
  });

  it('翻译服务端错误提示', () => {
    expect(translateError('原密码不正确', 'en')).toBe(
      'Current password is incorrect.',
    );
    expect(translateError('原密码不正确', 'zh')).toBe('原密码不正确');
  });

  it('翻译动态错误提示', () => {
    expect(translateError('该场次最多容纳 12 人', 'en')).toBe(
      'This session holds up to 12 people.',
    );
    expect(
      translateError(
        '未互相关注，最多可发送 3 条消息，互相关注后即可畅聊',
        'en',
      ),
    ).toBe('You can send up to 3 messages until you follow each other.');
  });

  it('支持校验错误数组', () => {
    expect(translateErrors(['原密码不正确', '密码至少 6 位'], 'en')).toEqual([
      'Current password is incorrect.',
      'Password must be at least 6 characters.',
    ]);
  });
});
