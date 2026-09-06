/** Everything needed to reach the realtime backend, once it is known to exist. */
export interface OnlineConfig {
  /** Project URL, validated as an absolute http(s) origin. */
  readonly url: string;
  /**
   * The anon key. Public by design - it ships inside the JS bundle - so this
   * is an identifier, not a credential. RLS is the access control.
   */
  readonly anonKey: string;
}
