import { appClient } from "@/services/appClient";

export const authService = {
  me: () => appClient.auth.me(),
  login: (email, password) => appClient.auth.loginViaEmailPassword(email, password),
  register: (payload) => appClient.auth.register(payload),
  verifyEmail: (payload) => appClient.auth.verifyOtp({ email: payload.email, otpCode: payload.code }),
  resendVerification: (email) => appClient.auth.resendOtp(email),
  verifyOtp: (payload) => appClient.auth.verifyOtp(payload),
  resendOtp: (email) => appClient.auth.resendOtp(email),
  loginWithProvider: (provider, redirectPath) =>
    appClient.auth.loginWithProvider(provider, redirectPath),
  requestPasswordReset: (email) => appClient.auth.resetPasswordRequest(email),
  confirmPasswordReset: (payload) => appClient.auth.resetPassword(payload),
  resetPassword: (payload) => appClient.auth.resetPassword(payload),
  logout: (redirectPath) => appClient.auth.logout(redirectPath),
  setToken: (token) => appClient.auth.setToken(token),
  redirectToLogin: (fromUrl) => appClient.auth.redirectToLogin(fromUrl),
};
