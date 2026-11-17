import {db} from './db';
import {CronExpressionParser} from 'cron-parser';
export async function processSchedules(now=new Date()){
  const due=await db.schedule.findMany({where:{paused:false,nextRun:{lte:now}},take:25});
  for(const s of due)await db.$transaction(async tx=>{
    const changed=await tx.schedule.updateMany({where:{id:s.id,paused:false,nextRun:s.nextRun},data:s.cron?{nextRun:CronExpressionParser.parse(s.cron,{tz:s.timezone,currentDate:now}).next().toDate()}:{paused:true}});
    if(changed.count)await tx.task.create({data:{userId:s.userId,instruction:s.instruction}});
  });
}
