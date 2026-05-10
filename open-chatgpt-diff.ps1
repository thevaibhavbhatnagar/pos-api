$stat = git diff --stat
$diff = git diff

$prompt = @"
Generate a concise git commit message.

Changed files:
$stat

Full diff:
$diff
"@

$encoded = [System.Uri]::EscapeDataString($prompt)

Start-Process "https://chatgpt.com/?q=$encoded"