/**
 * Checkout-funnel events recorded against a session.
 *
 * `CheckoutVisited`, `AddedShippingInfo` and `AddedPaymentInfo` are sent with
 * {@link CheckoutEvents.create}; the upsell and order values are sent with
 * {@link CheckoutEvents.update}. Together they let the server reconstruct where
 * a prospect abandoned checkout - before or after entering shipping or payment
 * details - and which upsells they were shown.
 */
export const CheckoutEvent = Object.freeze({
  /** The prospect reached the checkout page. The default for `create()`. */
  CheckoutVisited: 'checkout_visited',
  /** The prospect submitted their shipping details. Send with `create()`. */
  AddedShippingInfo: 'added_shipping_info',
  /** The prospect submitted their payment details. Send with `create()`, with `payment_method`. */
  AddedPaymentInfo: 'added_payment_info',
  /** An upsell was presented to the prospect. */
  UpsellOffered: 'upsell_offered',
  /** The prospect accepted a presented upsell. */
  UpsellAccepted: 'upsell_accepted',
  /** The prospect declined a presented upsell. */
  UpsellDeclined: 'upsell_declined',
  /** The order was placed successfully. */
  OrderPlaced: 'order_placed',
  /** The order was declined, typically by the payment processor. */
  OrderDeclined: 'order_declined',
} as const);

/** Any checkout-funnel event wire value. A bare string literal satisfies this type. */
export type CheckoutEvent = (typeof CheckoutEvent)[keyof typeof CheckoutEvent];
