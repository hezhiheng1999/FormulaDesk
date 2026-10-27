@echo off
if not exist "%~dp0index.html" (
  echo index.html is missing. Extract the complete portable ZIP first.
  pause
  exit /b 1
)
start "" "%~dp0index.html"
