@echo off
git pull origin main --no-edit > pull_output.txt 2>&1
echo DONE >> pull_output.txt
