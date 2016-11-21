--call npm install --dedupe  
--IF "%ERRORLEVEL%" NEQ "0" goto error

--call bower install --production
--IF "%ERRORLEVEL%" NEQ "0" goto error

--call gulp
--IF "%ERRORLEVEL%" NEQ "0" goto error

robocopy /Mir %DEPLOYMENT_SOURCE% %DEPLOYMENT_TARGET%
IF %ERRORLEVEL% GEQ 8 goto error

goto end

:error
endlocal  
echo An error has occurred during web site deployment.  
call :exitSetErrorLevel  
call :exitFromFunction 2>nul

:exitSetErrorLevel
exit /b 1

:exitFromFunction
()

:end
endlocal  
echo Finished successfully.