@echo off
set "parentDir=data"
set "sub1=data"
set "sub2=data1"
set "tempName=data_swap_folder"

:: Check if the folders exist
if exist "%parentDir%\%sub1%\" (
    if exist "%parentDir%\%sub2%\" (
        echo Found both folders, swapping...

        ren "%parentDir%\%sub1%" "%tempName%"
        ren "%parentDir%\%sub2%" "%sub1%"
        ren "%parentDir%\%tempName%" "%sub2%"

        echo Success!
    ) else (
        echo Error: %parentDir%\%sub2% not found.
    )
) else (
    echo Error: %parentDir%\%sub1% not found.
)

pause
