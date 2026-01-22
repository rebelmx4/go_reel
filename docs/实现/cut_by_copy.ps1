# --- Config ---
$InputFile = "input.mp4"
$FinalOutput = "final_output.mp4"
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

Write-Host "Step 1: Extracting Segments..." -ForegroundColor Cyan

# --- Phase 1: Extract ---
for ($i = 0; $i -lt $Segments.Count; $i++) {
    $out = "p$($i+1).mp4"
    $start = $Segments[$i].start
    $dur = $Segments[$i].duration
    
    $StepTimer = [System.Diagnostics.Stopwatch]::StartNew()
    
    # Using ffmpeg.exe (make sure ffmpeg is in this folder or PATH)
    & ffmpeg -v error -ss $start -i $InputFile -t $dur -c copy -movflags faststart $out -y
    
    $StepTimer.Stop()
    Write-Host "Segment $($i+1) Done | Time: $($StepTimer.Elapsed.TotalSeconds.ToString("F2"))s | Start: $start"
    
    "file '$out'" | Out-File -FilePath "filelist.txt" -Append -Encoding ascii
}

# --- Phase 2: Concat ---
Write-Host "`nStep 2: Merging Segments..." -ForegroundColor Cyan
$ConcatTimer = [System.Diagnostics.Stopwatch]::StartNew()

& ffmpeg -v error -f concat -safe 0 -i filelist.txt -c copy -movflags faststart $FinalOutput -y

$ConcatTimer.Stop()
$TotalTimer.Stop()

# --- Statistics ---
if (Test-Path $FinalOutput) {
    $OriginalSize = (Get-Item $InputFile).Length / 1MB
    $FinalSize = (Get-Item $FinalOutput).Length / 1MB

    Write-Host "`n================ STATISTICS ================" -ForegroundColor Green
    Write-Host "Original Size: $($OriginalSize.ToString("F2")) MB"
    Write-Host "Final Size:    $($FinalSize.ToString("F2")) MB"
    Write-Host "Merge Time:    $($ConcatTimer.Elapsed.TotalSeconds.ToString("F2")) s"
    Write-Host "Total Time:    $($TotalTimer.Elapsed.TotalSeconds.ToString("F2")) s"
    Write-Host "============================================" -ForegroundColor Green
} else {
    Write-Host "Error: Final output was not created. Check if ffmpeg exists." -ForegroundColor Red
}

# Cleanup
$Clean = Read-Host "`nDo you want to delete temporary p*.mp4 files? (y/n)"
if ($Clean -eq "y") {
    for ($i = 1; $i -le $Segments.Count; $i++) { 
        if (Test-Path "p$i.mp4") { Remove-Item "p$i.mp4" } 
    }
    if (Test-Path "filelist.txt") { Remove-Item "filelist.txt" }
    Write-Host "Cleanup finished."
}