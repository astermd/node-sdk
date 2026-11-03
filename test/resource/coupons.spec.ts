import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../src/errors/index.js';
import { Coupons } from '../../src/resource/coupons.js';
import { makeHarness } from '../support/harness.js';

const PLAN_ITEM = { plan_id: '6a01b2c3d4e5f6a7b8c9d0f1', quantity: 1 };
const PRODUCT_ITEM = {
  product_id: '6a01b2c3d4e5f6a7b8c9d0a1',
  variant_id: '6a01b2c3d4e5f6a7b8c9d0a2',
  quantity: 2,
};

const RESULT = {
  coupon_id: '6a01b2c3d4e5f6a7b8c9d0f9',
  name: 'Welcome 20% off',
  discount_type: 'percent',
  value: 20,
  tiers: [],
  default_scope: { from_occurrence_index: 0, occurrence_count: 3 },
  gross_amount_cents: 9900,
  discount_cents: 1980,
  amount_cents: 7920,
  currency: 'usd',
  items: [],
};

describe('Coupons.validate', () => {
  it('posts code and items to coupons/validate', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(200, { success: true, message: 'ok', data: RESULT });

    const response = await new Coupons(transport).validate({
      code: 'WELCOME20',
      items: [PLAN_ITEM, PRODUCT_ITEM],
    });

    const request = http.lastRequest();
    expect(request.url).toBe('https://api.astermd.com/v1/sales/coupons/validate');
    expect(request.method).toBe('POST');
    expect(request.headers.authorization).toBe('Bearer test-jwt');
    expect(request.headers['content-type']).toBe('application/json');
    expect(JSON.parse(request.body)).toEqual({ code: 'WELCOME20', items: [PLAN_ITEM, PRODUCT_ITEM] });
    expect(response.data()).toEqual(RESULT);
  });

  it('omits patient_id, email and opportunity_id when absent', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(200, { success: true, message: 'ok', data: RESULT });

    await new Coupons(transport).validate({ code: 'WELCOME20', items: [PLAN_ITEM] });

    const body = JSON.parse(http.lastRequest().body) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['code', 'items']);
  });

  it('sends each optional identifier when provided', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(200, { success: true, message: 'ok', data: RESULT });

    await new Coupons(transport).validate({
      code: 'WELCOME20',
      items: [PLAN_ITEM],
      patientId: '6a7f1c2d3e4b5a6978123457',
      email: 'jane.doe@example.com',
      opportunityId: '6a7f1c2d3e4b5a6978123458',
    });

    expect(JSON.parse(http.lastRequest().body)).toEqual({
      code: 'WELCOME20',
      items: [PLAN_ITEM],
      patient_id: '6a7f1c2d3e4b5a6978123457',
      email: 'jane.doe@example.com',
      opportunity_id: '6a7f1c2d3e4b5a6978123458',
    });
  });

  it('sends only the identifier that was provided', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(200, { success: true, message: 'ok', data: RESULT });

    await new Coupons(transport).validate({ code: 'X', items: [PLAN_ITEM], email: 'jane.doe@example.com' });

    expect(JSON.parse(http.lastRequest().body)).toEqual({
      code: 'X',
      items: [PLAN_ITEM],
      email: 'jane.doe@example.com',
    });
  });

  it('maps 404 for an unknown code to NotFoundError', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(404, { success: false, message: 'There is no coupon with this code' });

    const failure = new Coupons(transport).validate({ code: 'NOPE', items: [PLAN_ITEM] });

    await expect(failure).rejects.toBeInstanceOf(NotFoundError);
    await expect(failure).rejects.toThrow('There is no coupon with this code');
  });

  it('maps 422 for any other coupon refusal to ValidationError', async () => {
    const { transport, http } = makeHarness();
    http.enqueueJson(422, { success: false, message: 'The coupon has expired' });

    const failure = new Coupons(transport).validate({ code: 'OLD', items: [PLAN_ITEM] });

    await expect(failure).rejects.toBeInstanceOf(ValidationError);
    await expect(failure).rejects.toThrow('The coupon has expired');
  });
});
