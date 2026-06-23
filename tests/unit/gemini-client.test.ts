import { GeminiError, generateGeminiContent, validateGeminiKey } from '../../src/lib/gemini/client';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('surfaces unsupported location during key validation instead of marking the key invalid', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'User location is not supported for the API use.' } }), {
        status: 403,
        headers: { 'content-type': 'application/json' }
      })
    )
  );

  const result = await validateGeminiKey('test-key');

  expect(result.status).toBe('error');
  expect(result.code).toBe('location');
  expect(result.message).toBe('User location is not supported for the API use.');
});

it('still classifies actual invalid keys as invalid', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'API key not valid. Please pass a valid API key.' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      })
    )
  );

  const result = await validateGeminiKey('bad-key');

  expect(result.status).toBe('invalid');
  expect(result.code).toBe('invalid');
  expect(result.message).toContain('API key not valid');
});

it('throws unsupported location as a location GeminiError for generation calls', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'User location is not supported for the API use.' } }), {
        status: 403,
        headers: { 'content-type': 'application/json' }
      })
    )
  );

  await expect(
    generateGeminiContent({
      apiKey: 'test-key',
      model: 'gemini-3.1-flash-lite',
      parts: [{ text: 'ok' }]
    })
  ).rejects.toMatchObject({ code: 'location' } satisfies Partial<GeminiError>);
});
