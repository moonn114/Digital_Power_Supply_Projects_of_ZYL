@echo off
chcp 65001 >nul
cd /d %~dp0

echo.
echo ╔══════════════════════════════════════╗
echo ║   ⚡ Digital Power Lab Blog        ║
echo ║   数字电源项目博客                   ║
echo ╠══════════════════════════════════════╣
echo ║   本地地址: http://localhost:8080    ║
echo ║   按 Ctrl+C 停止服务器              ║
echo ╚══════════════════════════════════════╝
echo.
echo   正在启动服务器...

node server.js
pause
