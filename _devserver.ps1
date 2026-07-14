$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8123/")
$listener.Start()
$root = "C:\Users\Usuario\Downloads\prime"
Write-Host "Serving $root on http://localhost:8123/"
while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    $path = $req.Url.LocalPath
    if ($path -eq "/") { $path = "/index.html" }
    $filePath = Join-Path $root $path.TrimStart("/")
    if (Test-Path $filePath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        switch -Wildcard ($filePath) {
            "*.html" { $res.ContentType = "text/html" }
            "*.js"   { $res.ContentType = "application/javascript" }
            "*.css"  { $res.ContentType = "text/css" }
            "*.json" { $res.ContentType = "application/json" }
            "*.xml"  { $res.ContentType = "application/xml" }
            default  { $res.ContentType = "text/plain" }
        }
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $res.StatusCode = 404
    }
    $res.OutputStream.Close()
}
