$linesToRemove = @(4868, 4869, 4870, 4871, 4872, 4873, 4882, 4883, 4884, 4885, 4886, 5937, 5938, 5939, 5940, 5941, 5942, 5951, 5952, 5953, 5954, 5955)
$content = Get-Content 'src/components/App.tsx'
$newContent = New-Object System.Collections.Generic.List[string]
for ($i=0; $i -lt $content.Count; $i++) {
    if (-not ($linesToRemove -contains ($i+1))) {
        $newContent.Add($content[$i])
    }
}
$newContent | Set-Content 'src/components/App.tsx'
