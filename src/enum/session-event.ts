/**
 * Events recorded directly against a session through
 * {@link SessionEvents.create}.
 *
 * These cover moments in the visitor's journey that no other resource reports:
 * which page they are on, and when they start identity verification. Funnel
 * events tied to a specific record - intake steps, cart changes, checkout
 * states - are recorded by their own resources, not here. Any value outside
 * this list is rejected by the server.
 */
export const SessionEvent = Object.freeze({
  /** The visitor opened a page. Requires a `page` describing it. */
  PageView: 'page_view',
  /** The visitor started identity verification. */
  BeginIdentityVerification: 'begin_identity_verification',
} as const);

/** Any session-event wire value. A bare string literal satisfies this type. */
export type SessionEvent = (typeof SessionEvent)[keyof typeof SessionEvent];
