@echo off
echo Installing required packages...
pip install --upgrade pip
pip install openai==1.35.12
pip install Pillow==10.0.0
pip install requests==2.31.0
echo Installation complete!
pause
