# $diff = git diff
# $prompt = "Generate a git commit message for this change:`n`n$diff"
# $encoded = [System.Uri]::EscapeDataString($prompt)

# Start-Process "https://chatgpt.com/?prompt=$encoded"


# main - short generate
# $diff = git diff --stat
# $encoded = [System.Uri]::EscapeDataString("Generate git commit message for:`n$diff")

# Start-Process "https://chatgpt.com/?prompt=$encoded"


# clipboard 
$diff = git diff
$prompt = "Generate git commit message for:`n$diff"

# Copy prompt to clipboard
$prompt | Set-Clipboard

# Open ChatGPT homepage
Start-Process "https://chatgpt.com"

Write-Host "Prompt copied to clipboard and ChatGPT opened!"

# chat =>project
# https://chatgpt.com/g/g-p-694287ede9888191badf3a9f5c175537-use-react-form-instead-of-formik/project?prompt=%22hello%22

# chat =>project=>specific chat
# https://chatgpt.com/g/g-p-694287ede9888191badf3a9f5c175537/c/6a01585f-4d0c-8323-9e4e-ebb398209248?prompt=%22update%20commit.ps1%22