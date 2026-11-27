import { CheckoutEvent } from '../enum/checkout-event.js';
import type { Transport } from '../http/transport.js';
import type { Response as ApiResponse } from '../response.js';
import { AbstractResource } from './abstract-resource.js';

/** Currency recorded when the caller does not specify one. */
const DEFAULT_CURRENCY = 'USD';

/** Options for {@link CheckoutEvents.update}. */
export interface CheckoutEventUpdateOptions {
  /** The session whose checkout record is being advanced. */
  session: string;
  /** The funnel state now reached. */
  event: CheckoutEvent;
  /**
   * Additional context for this event - which upsell was shown, the order total,
   * a decline reason. Forwarded unmodified except that it can never override
   * `event`.
   */
  data?: Record<string, unknown>;
}

/**
 * Checkout events - the visitor's progress through the checkout funnel.
 *
 * Where {@link Sessions} records that a visit happened and {@link Carts} records
 * what was selected, this resource records what happened at the till: the
 * checkout page opening, each upsell offered and accepted or declined, and
 * finally whether the order was placed or declined. Together those events are
 * what makes checkout abandonment measurable.
 *
 * {@link CheckoutEvents.create} records the pre-order stages: `checkout_visited`
 * (the default) when the checkout page opens, then `added_shipping_info` and
 * `added_payment_info` as the visitor fills in the form. The upsell and order
 * stages go through {@link CheckoutEvents.update} with the matching
 * {@link CheckoutEvent}. Neither call can have its event overridden by the
 * extra payload, so the funnel state the server records is always the one the
 * SDK's caller chose explicitly.
 */
export class CheckoutEvents extends AbstractResource {
  /**
   * @param transport The shared transport.
   */
  constructor(transport: Transport) {
    super(transport);
  }

  /**
   * Records a pre-order checkout stage for a session.
   *
   * Call it with the default `CheckoutVisited` when the visitor reaches the
   * checkout page, then again with `AddedShippingInfo` when they submit
   * shipping details and `AddedPaymentInfo` (with a `payment_method` of
   * `apple_pay` | `google_pay` | `card` | `paypal` in `data`) when they submit
   * payment details. Use this method, not {@link CheckoutEvents.update}, for
   * those stages: `update()` fails with a 404 until a checkout record exists
   * for the session. `currency` defaults to `USD` when you do not supply one,
   * since the server requires a currency to interpret any amounts in the
   * payload.
   *
   * @param session The session reaching checkout.
   * @param data Additional context, e.g. `order_value`, `order_total`,
   *   `currency`, `payment_method`, or `product_id` (the product being checked
   *   out). Cannot override `session` or `event`.
   * @param event The stage to record. Defaults to `CheckoutVisited`.
   * @returns The created checkout-event record.
   * @throws {ValidationError} If the session or payload is rejected.
   * @throws {ApiError} On any other non-2xx status.
   * @throws {TransportError} If the request never completed.
   */
  async create<T = Record<string, unknown>>(
    session: string,
    data: Record<string, unknown> = {},
    event: CheckoutEvent = CheckoutEvent.CheckoutVisited,
  ): Promise<ApiResponse<T>> {
    // Data first, fixed keys last: PHP's `+` keeps the left operand on a
    // conflict, so the payload must not be able to rewrite session or event.
    const body: Record<string, unknown> = {
      ...data,
      session,
      event,
    };

    if (body.currency === undefined || body.currency === '') {
      body.currency = DEFAULT_CURRENCY;
    }

    return await this.transport.send<T>({
      service: 'sales',
      method: 'POST',
      path: '/checkout-events/create',
      body,
    });
  }

  /**
   * Advances a session's checkout record to a new funnel state.
   *
   * Send one call per post-checkout state the visitor reaches: an upsell
   * offered, then accepted or declined, then the order placed or declined.
   * Shipping and payment details are recorded with
   * {@link CheckoutEvents.create}, not here. The payload carries whatever
   * context that state needs, but it can never override `event` - the state
   * recorded is always the one you passed explicitly. For an `OrderPlaced` event,
   * `data` may include an optional `payment` object describing the settled
   * payment method: `type` (`paypal` | `apple_pay` | `gpay` | `credit_card` |
   * `pre_paid`), `pre_auth` (boolean), `pre_auth_qa` and `pre_auth_amount`
   * (optional), and an optional `card` object (`type` - `amex` | `visa` |
   * `mastercard` | `discover` | `diners_club` | `jcb`, optional `bin`, required
   * `exp`).
   *
   * @param options The session, the new state, and any context for it.
   * @returns The updated checkout-event record.
   * @throws {NotFoundError} If no checkout record exists for the session.
   * @throws {ValidationError} If the event or payload is rejected.
   * @throws {ApiError} On any other non-2xx status.
   * @throws {TransportError} If the request never completed.
   */
  async update<T = Record<string, unknown>>(options: CheckoutEventUpdateOptions): Promise<ApiResponse<T>> {
    return await this.transport.send<T>({
      service: 'sales',
      method: 'PUT',
      path: '/checkout-events/update/{session_id}',
      pathParams: { session_id: options.session },
      body: { ...(options.data ?? {}), event: options.event },
    });
  }
}
