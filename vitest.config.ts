import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({resolve:{alias:{'@':path.resolve('src')}},test:{include:['tests/**/*.test.ts'],testTimeout:30000,env:{TOKEN_ENCRYPTION_KEY:'a'.repeat(64),AGENTH_RUNTIME_DIR:path.resolve('.runtime'),AI_PROVIDER:'ollama',AI_MODEL:'qwen3:4b-instruct',OLLAMA_URL:'http://127.0.0.1:1'}}});

