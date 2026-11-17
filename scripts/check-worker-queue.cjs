const path=require('node:path');
const {loadEnvConfig}=require('@next/env');
const {PrismaClient}=require('@prisma/client');
loadEnvConfig(path.resolve(__dirname,'..'));
const db=new PrismaClient();
(async()=>{
 const [queued,active,scheduled]=await Promise.all([
   db.task.count({where:{status:'queued'}}),
   db.task.count({where:{status:{in:['planning','running']}}}),
   db.schedule.count({where:{paused:false}})
 ]);
 console.log(JSON.stringify({queuedTasks:queued,activeTasks:active,unpausedSchedules:scheduled}));
})().catch(error=>{console.error('DB_STATUS_ERROR',error.message);process.exitCode=1}).finally(()=>db.$disconnect());
