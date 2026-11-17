// Server-side configuration only. Never import into a client component.
export function aiProvider(){
  const provider=process.env.AI_PROVIDER||'ollama';
  if(provider!=='ollama'&&provider!=='chatanywhere')throw new Error('Unsupported AI_PROVIDER. Choose chatanywhere or ollama.');
  return provider;
}
export function chatAnywhereConfigured(){const key=process.env.CHATANYWHERE_API_KEY?.trim();return Boolean(key&&!/^(ENTER_|YOUR_|REPLACE_|CHANGE_ME)/i.test(key));}
export function chatAnywhereModel(){return 'gpt-4o-mini';}
