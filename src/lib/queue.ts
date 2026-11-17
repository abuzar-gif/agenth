import { PgBoss } from 'pg-boss';
let instance:PgBoss | undefined;
export async function queue(){
  if(!instance){const boss=new PgBoss({connectionString:process.env.DATABASE_URL!});boss.on('error',e=>console.error('Queue:',e.message));await boss.start();await boss.createQueue('agent-task',{retryLimit:0});instance=boss;}
  return instance;
}
export async function enqueue(taskId:string){const boss=await queue();return boss.send('agent-task',{taskId},{singletonKey:taskId,expireInSeconds:600});}
