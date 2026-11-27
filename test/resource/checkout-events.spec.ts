import { describe, expect, it } from 'vitest';
import { CheckoutEvent } from '../../src/enum/index.js';
import { CheckoutEvents } from '../../src/resource/checkout-events.js';
import { OK_ENVELOPE, makeHarness } from '../support/harness.js';

describe('CheckoutEvents.create', () => {
  it('posts checkout_visited with the session and a USD default', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    await new CheckoutEvents(transport).create('s-1');

    const request = http.lastRequest();
    expect(request.url).toBe('https://api.astermd.com/v1/sales/checkout-events/create');
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toEqual({
      session: 's-1',
      event: 'checkout_visited',
      currency: 'USD',
    });
  });

  it('merges an extra payload while keeping the currency default', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    await new CheckoutEvents(transport).create('s-1', { cart_total: 199.99, items_count: 3 });

    expect(JSON.parse(http.lastRequest().body)).toEqual({
      session: 's-1',
      event: 'checkout_visited',
      currency: 'USD',
      cart_total: 199.99,
      items_count: 3,
    });
  });

  it('honours an explicit currency', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    await new CheckoutEvents(transport).create('s-1', { currency: 'CAD' });

    expect(JSON.parse(http.lastRequest().body)).toMatchObject({ currency: 'CAD' });
  });

  it('replaces an empty-string currency with the default', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    await new CheckoutEvents(transport).create('s-1', { currency: '' });

    expect(JSON.parse(http.lastRequest().body)).toMatchObject({ currency: 'USD' });
  });

  it('does not let the payload override the session or the event', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    await new CheckoutEvents(transport).create('s-1', {
      session: 'attacker-session',
      event: 'order_placed',
    });

    expect(JSON.parse(http.lastRequest().body)).toMatchObject({
      session: 's-1',
      event: 'checkout_visited',
    });
  });

  it('posts added_shipping_info to checkout-events/create', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    await new CheckoutEvents(transport).create(
      's-1',
      { product_id: '64b2f0c7e3a1d2b3c4e5f6b1', order_total: 159.99 },
      CheckoutEvent.AddedShippingInfo,
    );

    const request = http.lastRequest();
    expect(request.url).toBe('https://api.astermd.com/v1/sales/checkout-events/create');
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toEqual({
      session: 's-1',
      event: 'added_shipping_info',
      currency: 'USD',
      product_id: '64b2f0c7e3a1d2b3c4e5f6b1',
      order_total: 159.99,
    });
  });

  it('posts added_payment_info with its payment_method', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    await new CheckoutEvents(transport).create(
      's-1',
      { payment_method: 'card', currency: 'CAD' },
      CheckoutEvent.AddedPaymentInfo,
    );

    expect(JSON.parse(http.lastRequest().body)).toEqual({
      session: 's-1',
      event: 'added_payment_info',
      currency: 'CAD',
      payment_method: 'card',
    });
  });

  it('does not let the payload override an explicit event', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    await new CheckoutEvents(transport).create('s-1', { event: 'order_placed' }, CheckoutEvent.AddedShippingInfo);

    expect(JSON.parse(http.lastRequest().body)).toMatchObject({ event: 'added_shipping_info' });
  });

  it('forwards an optional product_id', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(201, OK_ENVELOPE);

    await new CheckoutEvents(transport).create('s-1', { product_id: '64b2f0c7e3a1d2b3c4e5f6b1' });

    expect(JSON.parse(http.lastRequest().body)).toEqual({
      session: 's-1',
      event: 'checkout_visited',
      currency: 'USD',
      product_id: '64b2f0c7e3a1d2b3c4e5f6b1',
    });
  });
});

describe('CheckoutEvents.update', () => {
  it('puts the event to checkout-events/update/{session_id}', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(200, OK_ENVELOPE);

    await new CheckoutEvents(transport).update({
      session: 's-1',
      event: CheckoutEvent.OrderPlaced,
    });

    const request = http.lastRequest();
    expect(request.url).toBe('https://api.astermd.com/v1/sales/checkout-events/update/s-1');
    expect(request.method).toBe('PUT');
    expect(JSON.parse(request.body)).toEqual({ event: 'order_placed' });
  });

  it.each([
    [CheckoutEvent.CheckoutVisited, 'checkout_visited'],
    [CheckoutEvent.AddedShippingInfo, 'added_shipping_info'],
    [CheckoutEvent.AddedPaymentInfo, 'added_payment_info'],
    [CheckoutEvent.UpsellOffered, 'upsell_offered'],
    [CheckoutEvent.UpsellAccepted, 'upsell_accepted'],
    [CheckoutEvent.UpsellDeclined, 'upsell_declined'],
    [CheckoutEvent.OrderPlaced, 'order_placed'],
    [CheckoutEvent.OrderDeclined, 'order_declined'],
  ])('sends %s as the wire value %s', async (event, wire) => {
    const { transport, http } = makeHarness();
    http.enqueueJson(200, OK_ENVELOPE);

    await new CheckoutEvents(transport).update({ session: 's-1', event });

    expect(JSON.parse(http.lastRequest().body)).toEqual({ event: wire });
  });

  it('merges the payload but never lets it override the event', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(200, OK_ENVELOPE);

    await new CheckoutEvents(transport).update({
      session: 's-1',
      event: CheckoutEvent.UpsellAccepted,
      data: { upsell_product_id: 'p-9', event: 'order_declined' },
    });

    expect(JSON.parse(http.lastRequest().body)).toEqual({
      event: 'upsell_accepted',
      upsell_product_id: 'p-9',
    });
  });
});
