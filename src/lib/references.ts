// Tool results can feed subsequent steps without asking the model to invent identifiers.
// Example: "$step:0.messages.0.id" resolves a Gmail search result's message ID.
export function resolveReferences(value:unknown,outputs:Map<number,unknown>):unknown{
  if(typeof value==='string'&&value.startsWith('$step:')){
    const [index,...parts]=value.slice(6).split('.');
    if(!/^\d+$/.test(index)||parts.some(p=>['__proto__','constructor','prototype'].includes(p)))throw new Error('Invalid tool result reference.');
    let current=outputs.get(Number(index));
    for(const part of parts){if(current===null||typeof current!=='object'||!Object.hasOwn(current,part))throw new Error(`Tool result reference unavailable: ${value}`);current=(current as Record<string,unknown>)[part];}
    if(current===undefined)throw new Error(`Tool result reference unavailable: ${value}`);
    return current;
  }
  if(Array.isArray(value))return value.map(v=>resolveReferences(v,outputs));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolveReferences(v,outputs)]));
  return value;
}
