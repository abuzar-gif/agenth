import {describe,it,expect} from 'vitest';
import {whatsappPairingPhone,pairingPhonePreview} from '../src/lib/whatsapp-link-phone';
describe('WhatsApp pairing phone numbers',()=>{
 it.each([
  ['03001234567','923001234567'],
  ['03 00 123 4567','923001234567'],
  ['3001234567','923001234567'],
  ['+92 300 1234567','923001234567'],
  ['00923001234567','923001234567'],
  ['923001234567','923001234567'],
  ['+44 7700 900123','447700900123'],
 ])('normalizes %s to %s',(input,expected)=>expect(whatsappPairingPhone(input)).toBe(expected));
 it('shows Pakistan country code in the UI',()=>{
  expect(pairingPhonePreview('03001234567')).toBe('+92 300 1234567');
  expect(pairingPhonePreview('03')).toBe('');
 });
 it.each(['03','0300123456','0211234567','92300123456','hello','+92 abc','000'])('rejects invalid %s',input=>{
  expect(()=>whatsappPairingPhone(input)).toThrow();
 });
});
