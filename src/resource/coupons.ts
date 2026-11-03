import type { Response as ApiResponse } from '../response.js';
import type { Transport } from '../http/transport.js';
import { AbstractResource } from './abstract-resource.js';

/**
 * One cart line for {@link Coupons.validate}: either a subscription plan, or a
 * product with its variant - never both. Never an amount; AsterMD prices the
 * line itself.
 */
export type CouponCartItem =
  | {
      /** The subscription plan the line is sold on. Priced at the plan's first payment. */
      plan_id: string;
      /** Units of the line, an integer from 1 to 999. */
      quantity: number;
    }
  | {
      /** The AsterMD product. */
      product_id: string;
      /** The product's variant; the product id again for a product without variants. */
      variant_id: string;
      /** Units of the line, an integer from 1 to 999. */
      quantity: number;
    };

/** Options for {@link Coupons.validate}. */
export interface CouponValidateOptions {
  /** The code the shopper typed. Not case sensitive. */
  code: string;
  /** The cart, main item first. Between 1 and 6 lines. */
  items: CouponCartItem[];
  /**
   * The AsterMD patient id of the shopper, when already a patient. Sent only
   * when provided. When several of `patientId`, `email` and `opportunityId` are
   * given, the server uses them in that order.
   */
  patientId?: string;
  /** The shopper's email; used when `patientId` is not sent. Sent only when provided. */
  email?: string;
  /**
   * The shopper's opportunity id; used when neither `patientId` nor `email` is
   * sent. Sent only when provided.
   */
  opportunityId?: string;
}

/**
 * Coupons - checking a code the shopper typed against their cart.
 *
 * Use this resource just before creating the payment: it tells the storefront
 * whether a coupon code can be used on the current cart, and what it takes off.
 * AsterMD prices the cart itself from its catalogue, so callers send product,
 * variant or plan identifiers and quantities - never amounts.
 *
 * The call applies to a channel whose payment provider is a storefront gateway.
 * Nothing is counted against the coupon by a check; redemption is recorded later,
 * when the order is synced.
 *
 * ```ts
 * const { discount_cents, amount_cents } = (
 *   await client.coupons().validate<{ discount_cents: number; amount_cents: number }>({
 *     code: 'WELCOME20',
 *     items: [{ plan_id: planId, quantity: 1 }],
 *     email: 'jane.doe@example.com',
 *   })
 * ).data();
 * ```
 */
export class Coupons extends AbstractResource {
  /**
   * @param transport The shared transport.
   */
  constructor(transport: Transport) {
    super(transport);
  }

  /**
   * Checks a coupon code against a cart without redeeming it.
   *
   * Call this when the shopper applies a code at checkout, before the payment is
   * created. The server validates the coupon's status, validity window, patient,
   * products, budget, scope and redemption limits, and prices the cart. The check
   * has no side effects. Inspect `data()` on the response for the coupon terms,
   * the price before and after the discount, and the discounted lines. A shopper
   * who is not a patient yet only fits a coupon open to anyone.
   *
   * @param options The code, the cart, and optionally who the shopper is
   *   (`patientId`, `email` or `opportunityId`). Each optional identifier is sent
   *   only when provided.
   * @returns The coupon check; `data()` holds `coupon_id`, `name`,
   *   `discount_type`, `value`, `tiers`, `default_scope`, `gross_amount_cents`,
   *   `discount_cents`, `amount_cents`, `currency` and the discounted `items`.
   * @throws {NotFoundError} If no coupon exists with this code.
   * @throws {ValidationError} If the coupon cannot be used on this cart, or the
   *   cart cannot be priced.
   * @throws {AuthenticationError} If the credentials are refused.
   * @throws {ApiError} On any other non-2xx status.
   * @throws {TransportError} If the request never completed.
   */
  async validate<T = Record<string, unknown>>(options: CouponValidateOptions): Promise<ApiResponse<T>> {
    const body: Record<string, unknown> = {
      code: options.code,
      items: options.items,
    };

    if (options.patientId !== undefined) {
      body.patient_id = options.patientId;
    }

    if (options.email !== undefined) {
      body.email = options.email;
    }

    if (options.opportunityId !== undefined) {
      body.opportunity_id = options.opportunityId;
    }

    return await this.transport.send<T>({
      service: 'sales',
      method: 'POST',
      path: '/coupons/validate',
      body,
    });
  }
}
