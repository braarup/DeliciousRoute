@echo off
echo === Python Environment Check ===
python --version
echo.

echo === Pip Version ===
pip --version
echo.

echo === Current Packages ===
pip list
echo.

echo === Installing OpenAI ===
pip install openai==1.35.12
echo.

echo === Installing Pillow ===
pip install Pillow==10.0.0
echo.

echo === Verifying Installation ===
python -c "import openai; print('OpenAI installed successfully')" 2>&1
python -c "import PIL; print('Pillow installed successfully')" 2>&1
echo.

echo === Virtual Environment Check ===
if exist .venv\ (
    echo Virtual environment found at .venv\
    echo Activating virtual environment...
    call .venv\Scripts\activate
    echo Installing packages in virtual environment...
    .venv\Scripts\pip.exe install openai==1.35.12
    .venv\Scripts\pip.exe install Pillow==10.0.0
    echo Testing imports in virtual environment...
    .venv\Scripts\python.exe -c "import openai; print('OpenAI OK in venv')" 2>&1
    .venv\Scripts\python.exe -c "import PIL; print('Pillow OK in venv')" 2>&1
) else (
    echo No virtual environment found
)

echo.
echo === Installation Complete ===
pause
