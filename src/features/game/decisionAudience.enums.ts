/** Who a pending decision is shown to, and who may answer it. */
export enum DecisionAudience {
  /** One player answers; everyone else watches an inert copy. */
  Owner = 'owner',
  /** Everyone may interact - nothing here belongs to a single seat. */
  Everyone = 'everyone',
}
