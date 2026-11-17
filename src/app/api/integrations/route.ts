import {api} from '@/lib/api';
import {integrationRegistry} from '@/lib/integrations';
export const GET=(r:Request)=>api(r,async userId=>Response.json(await integrationRegistry(userId)));
