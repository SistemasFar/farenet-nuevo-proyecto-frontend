@echo off
echo =====================================
echo SUBIENDO CAMBIOS A TEST-3
echo =====================================

git checkout Test-3

git add .

set /p mensaje=Ingrese mensaje del commit: 

git commit -m "%mensaje%"

git push origin Test-3

pause