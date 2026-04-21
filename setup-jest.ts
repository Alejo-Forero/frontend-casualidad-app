import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';

setupZonelessTestEnv({
  errorOnUnknownElements: false,
  errorOnUnknownProperties: false,
});

// Mock fetch nativo sin jest.fn()
(globalThis as any).fetch = (_url: string) =>
  Promise.resolve({
    text: () => Promise.resolve(''),
    ok: true,
  } as Response);

beforeEach(async () => {
  await resolveComponentResources(fetch);
});
