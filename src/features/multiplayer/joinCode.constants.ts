/**
 * The join code's shape, in one place.
 *
 * These were literals inside `createJoinCode` in onlineSession.ts, which was
 * fine while minting was the only thing that happened to a code. Now a code is
 * also typed in and validated, and three copies of an alphabet is how a code
 * comes to be accepted by the field and rejected by the server.
 */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const JOIN_CODE_LENGTH = 6;
