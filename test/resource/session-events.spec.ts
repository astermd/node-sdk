import { describe, expect, it } from 'vitest';
import { PageType, SessionEvent } from '../../src/enum/index.js';
import { SessionEvents } from '../../src/resource/session-events.js';
import { OK_ENVELOPE, makeHarness } from '../support/harness.js';

describe('SessionEvents.create', () => {
  it('posts a page_view with its page to session-events/create', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    const page = {
      type: PageType.Product,
      path: '/products/semaglutide',
      url: 'https://shop.example.com/products/semaglutide?utm_source=google',
      title: 'Semaglutide',
      referrer: 'https://www.example.org/',
      product_id: '64b2f0c7e3a1d2b3c4e5f6b1',
    };

    await new SessionEvents(transport).create({ session: 's-1', event: SessionEvent.PageView, page });

    const request = http.lastRequest();
    expect(request.url).toBe('https://api.astermd.com/v1/sales/session-events/create');
    expect(request.method).toBe('POST');
    expect(request.headers.authorization).toBe('Bearer test-jwt');
    expect(request.headers['content-type']).toBe('application/json');
    expect(JSON.parse(request.body)).toEqual({ session: 's-1', event: 'page_view', page });
  });

  it('posts begin_identity_verification with its meta and no page', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    await new SessionEvents(transport).create({
      session: 's-1',
      event: SessionEvent.BeginIdentityVerification,
      meta: { method: 'ssn' },
    });

    expect(JSON.parse(http.lastRequest().body)).toEqual({
      session: 's-1',
      event: 'begin_identity_verification',
      meta: { method: 'ssn' },
    });
  });

  it('accepts bare string literals for the event and page type', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    await new SessionEvents(transport).create({
      session: 's-1',
      event: 'page_view',
      page: { type: 'thank_you', path: '/thank-you' },
    });

    expect(JSON.parse(http.lastRequest().body)).toEqual({
      session: 's-1',
      event: 'page_view',
      page: { type: 'thank_you', path: '/thank-you' },
    });
  });
});

describe('SessionEvents.view', () => {
  it('gets session-events/view/{id}', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(200, OK_ENVELOPE);

    await new SessionEvents(transport).view('6a448ca2a2a4755628c5c54c');

    const request = http.lastRequest();
    expect(request.url).toBe('https://api.astermd.com/v1/sales/session-events/view/6a448ca2a2a4755628c5c54c');
    expect(request.method).toBe('GET');
  });
});
