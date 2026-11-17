/** Prepare a linked-device pairing number without changing the account owner's input. */
export function whatsappPairingPhone(raw:string):string{
  const compact=raw.trim().replace(/[\s()+.\-]/g,'');
  if(!/^\d+$/.test(compact))throw new Error('Enter digits only, with an optional + country code.');
  let digits=compact.startsWith('00')?compact.slice(2):compact;
  if(/^03\d{9}$/.test(digits))digits='92'+digits.slice(1);
  else if(/^3\d{9}$/.test(digits))digits='92'+digits;
  else if(/^0\d+$/.test(digits))throw new Error('For Pakistan, enter an 11-digit mobile number starting 03.');
  if(!/^[1-9]\d{6,14}$/.test(digits))throw new Error('Enter a complete international phone number.');
  if(digits.startsWith('92')&&!/^923\d{9}$/.test(digits))throw new Error('Pakistani WhatsApp numbers must be mobile numbers, such as 03001234567.');
  return digits;
}
export function pairingPhonePreview(raw:string):string{
  try{
    const number=whatsappPairingPhone(raw);
    return number.startsWith('923')?'+92 '+number.slice(2,5)+' '+number.slice(5):'+'+number;
  }catch{return ''}
}
