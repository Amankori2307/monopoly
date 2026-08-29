import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiSliceState {
  auctionBidInput: number;
}

const initialState: UiSliceState = {
  auctionBidInput: 10,
};

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setAuctionBidInput(state, action: PayloadAction<number>) {
      state.auctionBidInput = action.payload;
    },
  },
});

export const uiReducer = slice.reducer;
export const { setAuctionBidInput } = slice.actions;
