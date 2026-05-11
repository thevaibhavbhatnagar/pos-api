$diff = git diff --stat
$encoded = [System.Uri]::EscapeDataString("Generate git commit message for:`n$diff")

Start-Process "https://chatgpt.com/?prompt=$encoded"
