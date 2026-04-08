// ── Environment configuration ──
// Centralised access to all env vars with defaults.

import dotenv from 'dotenv';
dotenv.config();

const env = {
  port:             parseInt(process.env.PORT || '3000', 10),
  useMocks:         process.env.USE_MOCKS !== 'false',       // default: true
  databaseUrl:      process.env.DATABASE_URL || 'postgresql://localhost:5432/redbrick',
  jwtSecret:        process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn:     process.env.JWT_EXPIRES_IN || '7d',
  otpExpirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10),
  twilio: {
    accountSid:     process.env.TWILIO_ACCOUNT_SID,
    authToken:      process.env.TWILIO_AUTH_TOKEN,
    phoneNumber:    process.env.TWILIO_PHONE_NUMBER,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID, // optional
  },
  onesignal: {
    appId:          process.env.ONESIGNAL_APP_ID,
    apiKey:         process.env.ONESIGNAL_REST_API_KEY,
  },
  zesco: {
    apiUrl:         process.env.ZESCO_API_URL,
    apiKey:         process.env.ZESCO_API_KEY,
  },
  mtn: {
    apiUrl:         process.env.MTN_MOMO_API_URL,
    apiKey:         process.env.MTN_MOMO_API_KEY,
  },
  airtel: {
    apiUrl:         process.env.AIRTEL_MONEY_API_URL,
    apiKey:         process.env.AIRTEL_MONEY_API_KEY,
  },
  scoringEngineUrl: process.env.SCORING_ENGINE_URL || 'http://localhost:8001',
};

export default env;
