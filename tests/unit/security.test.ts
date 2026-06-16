import { redactText, redactUrl } from '../../src/lib/security/redact';
import { isRestrictedPageUrl } from '../../src/lib/security/url';

it('redacts sensitive text', () => {
  expect(redactText('mail me at person@example.com or +1 415 555 0100')).toContain('[EMAIL]');
  expect(redactText('token abcdefghijklmnopqrstuvwxyz1234567890')).toContain('[TOKEN]');
});

it('redacts sensitive query params', () => {
  expect(redactUrl('https://x.test/?token=secret&ok=1')).toBe('https://x.test/?token=%5BREDACTED%5D&ok=1');
});

it('rejects restricted extension pages', () => {
  expect(isRestrictedPageUrl('chrome://extensions')).toBe(true);
  expect(isRestrictedPageUrl('https://example.com')).toBe(false);
});
