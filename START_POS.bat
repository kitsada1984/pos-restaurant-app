@echo off
chcp 65001 > nul
title ระบบ POS ร้านอาหารตามสั่ง & สั่งอาหารผ่าน QR Code

echo ========================================================
echo   🍳 ระบบ POS ร้านอาหารตามสั่ง & สั่งอาหารผ่าน LINE QR 🍳
echo ========================================================
echo.
echo กำลังเริ่มต้นเซิร์ฟเวอร์ POS ในเครื่องของคุณ...
echo.

:: Show Local IP Address for other devices
for /f "tokens=4" %%a in ('route print 0.0.0.0 ^| find " 0.0.0.0 "') do set LOCAL_IP=%%a
echo [✓] IP ของเครื่องคอมพิวเตอร์ในร้าน: http://%LOCAL_IP%:3000
echo.
echo [✓] หน้าร้าน / แคชเชียร์:   http://localhost:3000/pos
echo [✓] หน้าจอห้องครัว (KDS):   http://localhost:3000/kitchen
echo [✓] หน้าจอลูกค้า (โต๊ะ 1):  http://%LOCAL_IP%:3000/table/1
echo.
echo ========================================================
echo   กดเปิดหน้าเว็บเบราว์เซอร์อัตโนมัติใน 3 วินาที...
echo ========================================================

start "" "http://localhost:3000"

:: Start Next.js Server on 0.0.0.0 port 3000
npm run start

pause
