获取关键帧 命令

```bat
ffprobe -v error -select_streams v:0 -show_entries packet=pts_time,flags -of csv=p=0 1.mp4 | findstr "K"
```

```
powershell -ExecutionPolicy Bypass -File D:\m\test\test_cut.ps1

Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

