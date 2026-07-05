param([int]$Port = 5500)

$root = Split-Path -Parent $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    $path = $req.Url.LocalPath
    if ($path -eq "/") { $path = "/index_9.html" }
    $filePath = Join-Path $root ($path.TrimStart('/'))
    try {
        $res.KeepAlive = $false
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath)
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css" }
                ".js"   { "application/javascript" }
                ".svg"  { "image/svg+xml" }
                default { "application/octet-stream" }
            }
            $res.ContentType = $contentType
            $res.ContentLength64 = $bytes.LongLength
            Write-Host "GET $path -> $filePath ($($bytes.LongLength) bytes)"
            $stream = $res.OutputStream
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Flush()
        } else {
            $res.StatusCode = 404
        }
    } catch {
        Write-Host "Request error: $_"
    } finally {
        $res.OutputStream.Close()
        $res.Close()
    }
}
