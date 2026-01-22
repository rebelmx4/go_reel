# --- Config (Transcoding Version) ---
$InputFile = "input.mp4"
$FinalOutput = "final_transcoded.mp4"
$Segments = @(
    @{start="00:00:00"; duration="00:14:00"}, 
    @{start="00:20:00"; duration="00:14:00"}, 
    @{start="00:40:00"; duration="00:14:00"}, 
    @{start="01:00:00"; duration="00:14:00"}, 
    @{start="01:20:00"; duration="00:14:00"}, 
    @{start="01:40:00"; duration="00:20:00"}
)

if (Test-Path "filelist.txt") { Remove-Item "filelist.txt" }
$TotalTimer = [System.Diagnostics.Stopwatch]::StartNew()

Write-Host "Step 1: Extracting & Transcoding Segments..." -ForegroundColor Yellow

# --- Phase 1: Transcode ---
for ($i = 0; $i -lt $Segments.Count; $i++) {
    $out = "p$($i+1).mp4"
    $start = $Segments[$i].start
    $dur = $Segments[$i].duration
    
    $StepTimer = [System.Diagnostics.Stopwatch]::StartNew()
    
    # 转码模式：libx264, crf 23, preset superfast (保证平衡)
    & ffmpeg -v error -ss $start -i $InputFile -t $dur -c:v libx264 -crf 23 -preset superfast -c:a aac $out -y
    
    $StepTimer.Stop()
    Write-Host "Segment $($i+1) Done | Time: $($StepTimer.Elapsed.TotalSeconds.ToString("F2"))s | Transcoded"
    
    "file '$out'" | Out-File -FilePath "filelist.txt" -Append -Encoding ascii
}

# --- Phase 2: Concat ---
Write-Host "`nStep 2: Merging Segments..." -ForegroundColor Yellow
$ConcatTimer = [System.Diagnostics.Stopwatch]::StartNew()

& ffmpeg -v error -f concat -safe 0 -i filelist.txt -c copy -movflags faststart $FinalOutput -y

$ConcatTimer.Stop()
$TotalTimer.Stop()

# --- Statistics ---
if (Test-Path $FinalOutput) {
    Write-Host "`n================ TRANSCODE STATISTICS ================" -ForegroundColor Green
    Write-Host "Total Time (Transcode): $($TotalTimer.Elapsed.TotalSeconds.ToString("F2")) s"
    Write-Host "Final File: $FinalOutput"
    Write-Host "======================================================" -ForegroundColor Green
}