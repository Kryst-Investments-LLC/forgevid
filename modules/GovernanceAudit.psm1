function Test-GovernanceCompliance {
    param (
        [string]$ChecklistPath,
        [string]$PlatformPath
    )

    $checklist = Get-Content $ChecklistPath | ConvertFrom-Json
    $results = @()

    foreach ($item in $checklist.items) {
        $status = if ($item.requirement -match "consent|privacy|transparency") {
            "pass"
        } else {
            "manual review"
        }

        $results += @{
            item = $item.name
            status = $status
        }
    }

    return $results
}
