import { config } from '../../config';
import logger from '../../utils/logger';

// ─── OTP Provider Interface ─────────────────────────
export interface OTPProvider {
  sendOtp(phone: string, otp: string): Promise<boolean>;
}

// ─── Console OTP Provider (Development) ─────────────
export class ConsoleOTPProvider implements OTPProvider {
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    logger.info(`[DEV OTP] Phone: ${phone}, OTP: ${otp}`);
    console.log(`\n========================================`);
    console.log(`  OTP for ${phone}: ${otp}`);
    console.log(`========================================\n`);
    return true;
  }
}

// ─── SMS OTP Provider (Future Integration) ──────────
export class SMSOTPProvider implements OTPProvider {
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    // TODO: Integrate with SMS gateway (e.g., Twilio, MSG91)
    logger.info(`[SMS] SMS would be sent to ${phone} with OTP`);
    console.log(`[SMS Provider] SMS would be sent to ${phone}`);
    return true;
  }
}

// ─── WhatsApp OTP Provider (Future Integration) ─────
export class WhatsAppOTPProvider implements OTPProvider {
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    // TODO: Integrate with WhatsApp Business API
    logger.info(`[WhatsApp] WhatsApp message would be sent to ${phone} with OTP`);
    console.log(`[WhatsApp Provider] WhatsApp message would be sent to ${phone}`);
    return true;
  }
}

// ─── Factory Function ───────────────────────────────
export function getOTPProvider(): OTPProvider {
  const provider = (config as any).sms?.provider || 'console';

  switch (provider) {
    case 'sms':
      return new SMSOTPProvider();
    case 'whatsapp':
      return new WhatsAppOTPProvider();
    case 'console':
    default:
      return new ConsoleOTPProvider();
  }
}
