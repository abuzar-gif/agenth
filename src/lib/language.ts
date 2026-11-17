export function languageInstruction(code:string,input?:string){
  const preference=code==='roman-ur'?'Roman Urdu (Latin letters)':code==='ur'?'Urdu script':'English';
  if(input===undefined)return preference;
  return `Automatically detect the language of the user's latest message and respond in the same language and script. If they write English, reply in natural English. If they write Urdu in Latin letters, reply in natural Pakistani Roman Urdu (not Urdu or Devanagari script), even with informal spellings or mistakes such as "kia", "kya", "mujy", "mujhe", "kese", "krna", "nhi" and mixed English terms. If they write Urdu script, reply in Urdu script. Do not correct casual spelling unless asked. Treat an English greeting such as "Hi" as English; for ambiguous input, prefer the saved language setting: ${preference}. Never describe your language-detection process.`;
}
