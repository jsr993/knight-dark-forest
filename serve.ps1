# ============================================================
# Крошечный локальный сервер для игры (не требует установки ничего).
# Запуск:  правый клик по файлу -> "Выполнить с помощью PowerShell"
# или в терминале:  powershell -ExecutionPolicy Bypass -File serve.ps1
# Потом открой в браузере:  http://localhost:8000/
# Остановить: Ctrl+C или просто закрыть окно.
# ============================================================
param([int]$Port = 8000)

$root = $PSScriptRoot
$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json'
  '.png'  = 'image/png'
  '.ico'  = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Игра запущена! Открой в браузере:  http://localhost:$Port/"
Write-Host "Остановить сервер: Ctrl+C или закрыть это окно."

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    # Один неудачный запрос не должен ронять весь сервер
    try {
      $path = $ctx.Request.Url.LocalPath
      if ($path -eq '/') { $path = '/index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $root ($path.TrimStart('/') -replace '/', '\')))

      # Не выдаём файлы за пределами папки игры
      if (-not $file.StartsWith($root) -or -not (Test-Path $file -PathType Leaf)) {
        $ctx.Response.StatusCode = 404
      } else {
        $bytes = [IO.File]::ReadAllBytes($file)
        $ext = [IO.Path]::GetExtension($file).ToLower()
        if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
        $ctx.Response.Headers.Add('Cache-Control', 'no-store')  # чтобы F5 всегда давал свежую версию
        $ctx.Response.ContentLength64 = $bytes.Length
        # На запрос HEAD браузеру нужны только заголовки, без тела
        if ($ctx.Request.HttpMethod -ne 'HEAD') {
          $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
      }
    } catch { }
    try { $ctx.Response.Close() } catch { }
  }
} finally {
  $listener.Stop()
}
