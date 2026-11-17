# ChatAnywhere setup

Open `.env.local` in the AgentH project root. Enter your own secret only on this line:

```dotenv
AI_PROVIDER=chatanywhere
CHATANYWHERE_API_KEY=your_actual_key_here
```

Do not paste it into chat, commit it or prefix it with NEXT_PUBLIC_. Existing ElevenLabs and other settings are preserved. The backend uses only `https://api.chatanywhere.org/v1/chat/completions` and `gpt-4o-mini`. Existing saved Qwen preferences do not override this selection. No OpenAI SDK or direct OpenAI endpoint is used.

After saving, run `powershell -ExecutionPolicy Bypass -File .\Restart-AgentH.ps1` from the project directory. Next.js and the task worker both load `.env.local` with Next.js environment precedence. If you also set AI_PROVIDER or the key in the terminal environment, that environment takes precedence; remove conflicting values first.

Run `npm run test:chatanywhere` to send one short real request and print its response, model and reported usage. This consumes your provider allowance. Then open http://localhost:3000, sign in, open AI chat and send a short message. The response streams from the backend and is saved in your existing conversation. Settings show configured status, which alone is not proof of valid credentials or available quota.

Missing credentials, rejected credentials, exhausted quota/rate limits, unavailable service and interrupted streams show explicit errors. There are no invented responses, automatic retries or silent provider switches. Partial interrupted text is retained as failed rather than completed. ChatAnywhere receives your prompts/context; local recognition and independently selected voice settings are unchanged. WhatsApp tools retain their dedicated-agent permissions and approval gates.

For optional local inference, set `AI_PROVIDER=ollama` in `.env.local`, keep `AI_MODEL=auto` and ensure local Ollama/Qwen3 is installed, then restart. In AI settings select Automatic or an installed Qwen3 model if a prior ChatAnywhere model preference was saved. Ollama is not contacted for ChatAnywhere chat or task inference.

ChatAnywhere's free keys have usage restrictions and quotas. Check the provider's current terms before public/commercial use: https://github.com/chatanywhere/GPT_API_free .


Local verification on 16 November 2026: configured key succeeded in a real gpt-4o-mini request, existing authenticated chat UI streaming and database persistence, and native plan_task tool calling with report-only output. The key was never printed. Welcome is the only speech-enabled screen; chat and agent replies stay silent.
