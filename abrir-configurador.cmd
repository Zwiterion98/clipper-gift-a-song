@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py redirect_admin.py
) else (
  python redirect_admin.py
)
if %errorlevel% neq 0 pause
