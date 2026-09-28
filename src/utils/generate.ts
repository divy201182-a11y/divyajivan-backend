function randomDigits(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

export function generateOrderNo(): string {
  return `ORD${randomDigits(6)}`;
}

export function generateAppointmentNo(): string {
  return `APT${randomDigits(6)}`;
}

export function generateBookingNo(): string {
  return `LBK${randomDigits(6)}`;
}

export function generateApplicationNo(): string {
  return `INS${randomDigits(6)}`;
}

export function generateConsultationNo(): string {
  return `TLM${randomDigits(6)}`;
}

export function generateEnquiryNo(): string {
  return `MTR${randomDigits(6)}`;
}

export function generateTransactionNo(): string {
  return `TXN${randomDigits(6)}`;
}

export function generateOtp(): string {
  return randomDigits(6);
}
