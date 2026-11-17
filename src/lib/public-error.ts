const backendMessage='There is a problem from the backend. We are trying to fix it.';

export function publicErrorMessage(error: unknown, fallback=backendMessage){
 const message=error instanceof Error?error.message:String(error||'');
 if(/chatanywhere|api\s*key|\.env|provider|token_encryption_key|prisma|database|localhost:5432|credentials\.json/i.test(message))return backendMessage;
 return message||fallback;
}

export {backendMessage};
