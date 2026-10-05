import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { api, internal } from '../convex/_generated/api';
import { inventedBrief, inventedExtraction } from './fixtures/brief';
const modules = import.meta.glob('../convex/**/*.ts');
const completed = () => new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(inventedExtraction()) }] }] }), { status: 200 });
describe('brief action and Convex call limit', () => {
  beforeEach(() => { vi.stubEnv('OPENAI_API_KEY', 'made-up-test-key'); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  test('sends only the brief as user data, caps the reply, disables provider storage and stores only timestamps', async () => {
    const t = convexTest(schema, modules);
    const fetchMock = vi.fn().mockImplementation(completed); vi.stubGlobal('fetch', fetchMock);
    const result = await t.action(api.brief.structure, { brief: inventedBrief });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    const request = JSON.parse(options.body);
    expect(request.input).toEqual([{ role: 'user', content: inventedBrief }]);
    expect(request.max_output_tokens).toBe(1500); expect(request.store).toBe(false);
    expect(result.fields.city.value).toBe('Jaipur');
    const rows = await t.run(ctx => ctx.db.query('aiCallLimits').withIndex('by_name', q => q.eq('name', 'brief')).take(2));
    expect(rows).toHaveLength(1); expect(rows[0].attempts).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(['_creationTime','_id','attempts','name']);
  });
  test('allows 30 attempts and blocks call 31 before contacting OpenAI', async () => {
    const t = convexTest(schema, modules);
    const fetchMock = vi.fn().mockImplementation(completed); vi.stubGlobal('fetch', fetchMock);
    for (let i = 0; i < 30; i++) await t.action(api.brief.structure, { brief: inventedBrief });
    await expect(t.action(api.brief.structure, { brief: inventedBrief })).rejects.toThrow('30 AI calls per hour');
    expect(fetchMock).toHaveBeenCalledTimes(30);
  });
  test('concurrent requests cannot exceed the remaining hourly allowance', async () => {
    const t = convexTest(schema, modules);
    await t.run(ctx => ctx.db.insert('aiCallLimits', { name: 'brief', attempts: Array(29).fill(Date.now()) }));
    const outcomes = await Promise.allSettled(Array.from({ length: 5 }, () => t.mutation(internal.briefLimit.reserve, {})));
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter(result => result.status === 'rejected')).toHaveLength(4);
  });
  test('uses a rolling hour and prunes expired timestamps', async () => {
    const t = convexTest(schema, modules);
    await t.run(ctx => ctx.db.insert('aiCallLimits', { name: 'brief', attempts: [Date.now() - 3600001, ...Array(29).fill(Date.now())] }));
    await t.mutation(internal.briefLimit.reserve, {});
    await expect(t.mutation(internal.briefLimit.reserve, {})).rejects.toThrow('30 AI calls per hour');
    const rows = await t.run(ctx => ctx.db.query('aiCallLimits').withIndex('by_name', q => q.eq('name', 'brief')).take(1));
    expect(rows[0].attempts).toHaveLength(30);
  });
  test('missing key stops before spending a call or contacting OpenAI', async () => {
    const t = convexTest(schema, modules); vi.stubEnv('OPENAI_API_KEY', '');
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(t.action(api.brief.structure, { brief: inventedBrief })).rejects.toThrow('OPENAI_API_KEY is not set');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await t.run(ctx => ctx.db.query('aiCallLimits').withIndex('by_name', q => q.eq('name', 'brief')).take(1))).toHaveLength(0);
  });
  test('empty and oversized briefs do not spend calls', async () => {
    const t = convexTest(schema, modules); const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(t.action(api.brief.structure, { brief: ' ' })).rejects.toThrow('16,000 characters');
    await expect(t.action(api.brief.structure, { brief: 'x'.repeat(16001) })).rejects.toThrow('16,000 characters');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test('truncated replies are not used and are not silently retried', async () => {
    const t = convexTest(schema, modules);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'incomplete', output: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(t.action(api.brief.structure, { brief: inventedBrief })).rejects.toThrow('no partial result');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  test('OpenAI quota errors give a safe explanation and never trigger automatic retries', async () => {
    const t = convexTest(schema, modules);
    const fetchMock = vi.fn().mockResolvedValue(new Response('private-provider-quota-body', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(t.action(api.brief.structure, { brief: inventedBrief })).rejects.toThrow('account quota or request limit');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  test('provider failures count towards the limit and never echo provider content', async () => {
    const t = convexTest(schema, modules);
    const fetchMock = vi.fn().mockResolvedValue(new Response('private-provider-body', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(t.action(api.brief.structure, { brief: inventedBrief })).rejects.toThrow('key was rejected');
    const rows = await t.run(ctx => ctx.db.query('aiCallLimits').withIndex('by_name', q => q.eq('name', 'brief')).take(1));
    expect(rows[0].attempts).toHaveLength(1); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
