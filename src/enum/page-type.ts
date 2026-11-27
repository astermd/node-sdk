/**
 * The kind of page a visitor viewed, reported with a
 * {@link SessionEvent.PageView} event.
 *
 * The list is fixed by the server: any value outside it is rejected. The page a
 * visitor last viewed is kept on their session as `last_page`, which is how
 * drop-off points are measured - so classify pages consistently across your
 * storefront.
 */
export const PageType = Object.freeze({
  /** The storefront's home page. */
  Home: 'home',
  /** A product detail page. Send the page's `product_id` alongside it. */
  Product: 'product',
  /** The cart page. */
  Cart: 'cart',
  /** A page of the intake or pre-qualifying questionnaire. */
  Intake: 'intake',
  /** The checkout page. */
  Checkout: 'checkout',
  /** A post-checkout upsell page. */
  Upsell: 'upsell',
  /** The order confirmation page. */
  ThankYou: 'thank_you',
  /** A content-only page - terms of service, privacy policy, about us. */
  Cms: 'cms',
  /** Any page that fits none of the other kinds. */
  Other: 'other',
} as const);

/** Any page-type wire value. A bare string literal satisfies this type. */
export type PageType = (typeof PageType)[keyof typeof PageType];
