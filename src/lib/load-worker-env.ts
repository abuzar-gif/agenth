// Match Next's development/production env precedence, including .env.local.
import {loadEnvConfig} from '@next/env';
loadEnvConfig(process.cwd(),process.env.NODE_ENV!=='production');
