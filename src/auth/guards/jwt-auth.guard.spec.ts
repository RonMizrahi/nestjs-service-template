import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn<boolean | undefined, unknown[]>() };
  const guard = new JwtAuthGuard(reflector as unknown as Reflector);
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it('bypasses authentication for @Public routes (happy path)', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('delegates to the passport JWT flow otherwise', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const superSpy = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype) as { canActivate: () => boolean }, 'canActivate')
      .mockReturnValue(true);

    expect(guard.canActivate(context)).toBe(true);
    expect(superSpy).toHaveBeenCalled();
    superSpy.mockRestore();
  });
});
