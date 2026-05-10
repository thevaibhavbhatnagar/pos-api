# $diff = git diff
# $prompt = "Generate a git commit message for this change:`n`n$diff"
# $encoded = [System.Uri]::EscapeDataString($prompt)

# Start-Process "https://chatgpt.com/?prompt=$encoded"
$diff = git diff --stat
$encoded = [System.Uri]::EscapeDataString("Generate git commit message for:`n$diff")

Start-Process "https://chatgpt.com/?q=$encoded"