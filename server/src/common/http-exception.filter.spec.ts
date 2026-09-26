import { BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function fakeHost(acceptLanguage?: string) {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { 'accept-language': acceptLanguage },
        query: {},
      }),
      getResponse: () => ({}),
    }),
  } as never;
}

describe('HttpExceptionFilter', () => {
  it('英文请求返回英文错误提示', () => {
    const reply = jest.fn();
    const filter = new HttpExceptionFilter({
      httpAdapter: { reply },
    } as never);

    filter.catch(new BadRequestException('原密码不正确'), fakeHost('en'));

    expect(reply).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        message: 'Current password is incorrect.',
      }),
      400,
    );
  });

  it('默认中文请求保留中文提示', () => {
    const reply = jest.fn();
    const filter = new HttpExceptionFilter({
      httpAdapter: { reply },
    } as never);

    filter.catch(new BadRequestException('原密码不正确'), fakeHost());

    expect(reply).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ message: '原密码不正确' }),
      400,
    );
  });
});
