// Shared sizing for horizontal rows, so the real VideoRow and its loading skeleton use the SAME
// card width (and the skeleton → content swap doesn't jump). Kept out of the component files,
// which should export only components (fast refresh needs that).

/** Sets --card-w: 15rem on phones, 18rem from the sm breakpoint up. */
export const ROW_CARD_WIDTH = '[--card-w:15rem] sm:[--card-w:18rem]'
