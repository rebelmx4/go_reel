@echo off

:: 先确保目标父目录存在
if not exist "E:\100_MyProjects\go_reel\go_reel_c" mkdir "E:\100_MyProjects\go_reel\go_reel_c"

:: 1. 移动 go_reel_c 下的内容
move "E:\100_MyProjects\go_reel1\go_reel_c\bin" "E:\100_MyProjects\go_reel\go_reel_c\"
move "E:\100_MyProjects\go_reel1\go_reel_c\ffmpeg-7.1.1-full_build-shared" "E:\100_MyProjects\go_reel\go_reel_c\"
move "E:\100_MyProjects\go_reel1\go_reel_c\test_video" "E:\100_MyProjects\go_reel\go_reel_c\"

:: 2. 移动 go_reel1 根目录下的内容
move "E:\100_MyProjects\go_reel1\bin" "E:\100_MyProjects\go_reel\"
move "E:\100_MyProjects\go_reel1\node_modules" "E:\100_MyProjects\go_reel\"
move "E:\100_MyProjects\go_reel1\out" "E:\100_MyProjects\go_reel\"

echo Done!
pause