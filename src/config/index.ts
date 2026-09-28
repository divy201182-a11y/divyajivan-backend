import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  server: {
    nodeEnv: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "4000", 10),
    isDev: (process.env.NODE_ENV || "development") === "development",
    isProd: process.env.NODE_ENV === "production",
  },

  db: {
    url: required("DATABASE_URL"),
  },

  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map(s => s.trim()),
  },

  otp: {
    devEnabled: process.env.DEV_OTP_ENABLED === "true",
    devCode: process.env.DEV_OTP_CODE || "123456",
  },

  sms: {
    provider: process.env.SMS_PROVIDER || "console",
    apiKey: process.env.SMS_API_KEY || "",
    whatsappProvider: process.env.WHATSAPP_PROVIDER || "console",
    whatsappApiKey: process.env.WHATSAPP_API_KEY || "",
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || "local",
    path: process.env.STORAGE_PATH || "./uploads",
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || "10485760", 10),
  },

  payment: {
    provider: process.env.PAYMENT_PROVIDER || "mock",
    secret: process.env.PAYMENT_SECRET || "",
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  },
};
