@echo off
rem ForgeVid daily self-marketing render — run by Windows Task Scheduler.
rem Renders today's rotation of clips and emails them to MARKETING_EMAIL
rem (set in .env.local). Output + errors land in marketing-out\daily-run.log.
cd /d C:\Users\yanp0\dev\forgevid
if not exist marketing-out mkdir marketing-out
echo ===== %date% %time% ===== >> marketing-out\daily-run.log
call npx tsx scripts/marketing-batch.ts >> marketing-out\daily-run.log 2>&1
