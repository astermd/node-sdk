import type { PageType } from '../enum/page-type.js';
import type { SessionEvent } from '../enum/session-event.js';
import type { Transport } from '../http/transport.js';
import type { Response as ApiResponse } from '../response.js';
import { AbstractResource } from './abstract-resource.js';

/** The page a {@link SessionEvent.PageView} event reports. Sent as-is. */
export interface SessionEventPage {
  /** The kind of page viewed. */
  type: PageType;
  /** Path of the page viewed, without the query string, e.g. `/products/semaglutide`. */
  path: string;
  /** Full URL of the page viewed, query string included. */
  url?: string;
  /** The page's document title. */
  title?: string;
  /** The page the visitor came from. */
  referrer?: string;
  /** The product the page shows - send it on {@link PageType.Product} pages. */
  product_id?: string;
}

/** Options for {@link SessionEvents.create}. */
export interface SessionEventCreateOptions {
  /** The session to record the event against. */
  session: string;
  /** The event to record. */
  event: SessionEvent;
  /**
   * The page viewed. Required when `event` is {@link SessionEvent.PageView};
   * ignored by the server for any other event.
   */
  page?: SessionEventPage;
  /**
   * Optional event payload, stored with the event exactly as sent - for
   * example `{ method: 'ssn' }` on {@link SessionEvent.BeginIdentityVerification}.
   */
  meta?: Record<string, unknown>;
}

/**
 * Session events - the visitor's page-by-page trail through your storefront.
 *
 * Where {@link Carts}, {@link CheckoutEvents} and {@link IntakeSubmissions}
 * record the funnel steps tied to their own records, this resource records the
 * moments in between: every page the visitor opens, and when they start identity
 * verification. Each event is appended to the session's event log.
 *
 * Send a {@link SessionEvent.PageView} on every page load. The page becomes the
 * session's `last_page` - where a visitor who drops off left - and counts as
 * activity for abandonment, without moving the session's funnel step:
 *
 * ```ts
 * await client.sessionEvents().create({
 *   session,
 *   event: SessionEvent.PageView,
 *   page: { type: PageType.Cart, path: '/cart', title: 'Your Cart' },
 * });
 * ```
 */
export class SessionEvents extends AbstractResource {
  /**
   * @param transport The shared transport.
   */
  constructor(transport: Transport) {
    super(transport);
  }

  /**
   * Records an event against a session.
   *
   * For {@link SessionEvent.PageView}, `page` describes the page opened and
   * becomes the session's `last_page`; the session's funnel step is left as it
   * was. For {@link SessionEvent.BeginIdentityVerification}, any `meta` is stored
   * with the event as sent. Inspect `data()` for the recorded event, including its
   * `_id`.
   *
   * @param options The session, the event, and its page or payload.
   * @returns The recorded event; `data()` holds `{ _id, session, event, meta, channel_id, created_at, … }`.
   * @throws {ApiError} If the event or page is rejected, or on any other non-2xx status.
   * @throws {TransportError} If the request never completed.
   */
  async create<T = Record<string, unknown>>(options: SessionEventCreateOptions): Promise<ApiResponse<T>> {
    const body: Record<string, unknown> = { session: options.session, event: options.event };

    if (options.page !== undefined) {
      body.page = options.page;
    }

    if (options.meta !== undefined) {
      body.meta = options.meta;
    }

    return await this.transport.send<T>({
      service: 'sales',
      method: 'POST',
      path: '/session-events/create',
      body,
    });
  }

  /**
   * Fetches a single session event by its identifier.
   *
   * Use the `_id` returned by {@link SessionEvents.create}. For `page_view`
   * events, the page is returned flattened into `meta` as `page_type`,
   * `page_path`, `page_url`, `page_title`, `referrer` and `product_id`.
   *
   * @param id The session event identifier.
   * @returns The session event.
   * @throws {NotFoundError} If the event does not exist.
   * @throws {ApiError} On any other non-2xx status.
   * @throws {TransportError} If the request never completed.
   */
  async view<T = Record<string, unknown>>(id: string): Promise<ApiResponse<T>> {
    return await this.transport.send<T>({
      service: 'sales',
      method: 'GET',
      path: '/session-events/view/{id}',
      pathParams: { id },
    });
  }
}
