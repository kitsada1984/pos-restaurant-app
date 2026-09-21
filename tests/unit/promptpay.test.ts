import { describe, it, expect } from 'vitest';
import { generatePromptPayPayload } from '@/lib/promptpay';

describe('PromptPay EMVCo Payload Generator Tests', () => {
  it('should generate valid PromptPay payload for Thai mobile phone number', () => {
    const payload = generatePromptPayPayload('0812345678');
    expect(payload).toBeTruthy();
    expect(payload.startsWith('000201')).toBe(true); // Tag 00: EMVCo version 01
    expect(payload.includes('A000000677010111')).toBe(true); // PromptPay AID
    expect(payload.includes('0066812345678')).toBe(true); // Formatted Thai mobile
    expect(payload.includes('5802TH')).toBe(true); // Country code Thailand
    expect(payload.includes('5303764')).toBe(true); // Currency code THB (764)
  });

  it('should generate dynamic PromptPay payload with exact amount', () => {
    const payload = generatePromptPayPayload('0812345678', 85.5);
    expect(payload).toBeTruthy();
    expect(payload.includes('540585.50')).toBe(true); // Tag 54: Amount 85.50
    // Check that CRC16 checksum (Tag 63) is present at the end
    expect(payload.includes('6304')).toBe(true);
    expect(payload.length).toBeGreaterThan(60);
  });

  it('should support 13-digit Thai National ID / Tax ID', () => {
    const payload = generatePromptPayPayload('1234567890123', 100);
    expect(payload).toBeTruthy();
    expect(payload.includes('02131234567890123')).toBe(true); // Tag 02 for Tax ID / Citizen ID
    expect(payload.includes('5406100.00')).toBe(true);
  });

  it('should return empty string on invalid target', () => {
    expect(generatePromptPayPayload('')).toBe('');
    expect(generatePromptPayPayload('---')).toBe('');
  });
});
