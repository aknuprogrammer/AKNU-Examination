import { createSlice } from '@reduxjs/toolkit';
import { setLocalAccessToken } from '../utils/api.js';

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
      setLocalAccessToken(action.payload.accessToken);
    },
    loginFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logoutSuccess(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      setLocalAccessToken('');
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
    }
  }
});

export const { loginStart, loginSuccess, loginFailure, logoutSuccess, updateUser } = authSlice.actions;
export default authSlice.reducer;
