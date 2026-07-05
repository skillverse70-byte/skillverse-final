import { appClient } from "@/services/appClient";

export const authService = {
  me: () => appClient.auth.me(),
  login: (email, password) => appClient.auth.loginViaEmailPassword(email, password),
  register: (payload) => appClient.auth.register(payload),
  verifyOtp: (payload) => appClient.auth.verifyOtp(payload),
  resendOtp: (email) => appClient.auth.resendOtp(email),
  loginWithProvider: (provider, redirectPath) =>
    appClient.auth.loginWithProvider(provider, redirectPath),
  requestPasswordReset: (email) => appClient.auth.resetPasswordRequest(email),
  resetPassword: (payload) => appClient.auth.resetPassword(payload),
  logout: (redirectPath) => appClient.auth.logout(redirectPath),
  setToken: (token) => appClient.auth.setToken(token),
  redirectToLogin: (fromUrl) => appClient.auth.redirectToLogin(fromUrl),
};
