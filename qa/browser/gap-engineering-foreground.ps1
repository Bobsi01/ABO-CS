param([int]$AboBrowserProcessId = 0, [switch]$Focus)
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AboForeground {
  public delegate bool EnumProc(IntPtr handle, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr parameter);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr handle, out uint process);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr handle);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr handle);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr handle, StringBuilder text, int count);
}
'@
$aboFocusApplied = $false
if ($Focus -and $AboBrowserProcessId -gt 0) {
  $aboWindows = [System.Collections.Generic.List[System.IntPtr]]::new()
  [AboForeground]::EnumWindows({ param($handle,$parameter) $aboPid=[uint32]0; [void][AboForeground]::GetWindowThreadProcessId($handle,[ref]$aboPid); if($aboPid -eq $AboBrowserProcessId -and [AboForeground]::IsWindowVisible($handle)) {$aboWindows.Add($handle)}; return $true }, [IntPtr]::Zero) | Out-Null
  foreach ($aboWindow in $aboWindows) { $aboFocusApplied = [AboForeground]::SetForegroundWindow($aboWindow) -or $aboFocusApplied }
}
$aboForegroundHandle = [AboForeground]::GetForegroundWindow()
$aboForegroundPid=[uint32]0
[void][AboForeground]::GetWindowThreadProcessId($aboForegroundHandle,[ref]$aboForegroundPid)
$aboTitle=[System.Text.StringBuilder]::new(512)
[void][AboForeground]::GetWindowText($aboForegroundHandle,$aboTitle,512)
[pscustomobject]@{at=[DateTimeOffset]::UtcNow.ToString('o'); process_id=$aboForegroundPid; title=$(if($aboForegroundPid -eq $AboBrowserProcessId){$aboTitle.ToString()}else{'Another application'}); expected_process_id=$AboBrowserProcessId; matched=($aboForegroundPid -eq $AboBrowserProcessId); focus_applied=$aboFocusApplied} | ConvertTo-Json -Compress
