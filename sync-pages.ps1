$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$docs = Join-Path $root "docs"
$docsStatic = Join-Path $docs "static"

New-Item -ItemType Directory -Force -Path $docsStatic | Out-Null

Copy-Item -LiteralPath (Join-Path $root "static\app.css") -Destination (Join-Path $docsStatic "app.css") -Force
Copy-Item -LiteralPath (Join-Path $root "static\app.js") -Destination (Join-Path $docsStatic "app.js") -Force
Copy-Item -LiteralPath (Join-Path $root "static\favicon.svg") -Destination (Join-Path $docsStatic "favicon.svg") -Force

$banner = @'
  <section class="pages-banner">
    Vista publica del proyecto. Para controlar el carrito, abre la aplicacion Flask dentro de la red local.
  </section>
'@

function Convert-TemplateToPages {
  param(
    [string]$Template,
    [string]$Destination
  )

  $html = Get-Content -Raw -LiteralPath (Join-Path $root "templates\$Template")

  $html = $html.Replace("{{ url_for('static', filename='favicon.svg') }}", "./static/favicon.svg")
  $html = $html.Replace("{{ url_for('static', filename='app.css') }}", "./static/app.css")
  $html = $html.Replace("{{ url_for('static', filename='app.js') }}", "./static/app.js")
  $html = $html.Replace("{{ url_for('index') }}", "./index.html")
  $html = $html.Replace("{{ url_for('monitoreo') }}", "./monitoreo.html")
  $html = $html.Replace('  <main class="shell">', "  <main class=`"shell`">`r`n$banner")

  Set-Content -LiteralPath (Join-Path $docs $Destination) -Value $html -Encoding UTF8
}

Convert-TemplateToPages -Template "index.html" -Destination "index.html"
Convert-TemplateToPages -Template "monitoreo.html" -Destination "monitoreo.html"

$pagesCss = @'

.pages-banner {
  margin-bottom: 10px;
  padding: 10px 14px;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
  font-size: 13px;
  font-weight: 700;
}
'@

Add-Content -LiteralPath (Join-Path $docsStatic "app.css") -Value $pagesCss -Encoding UTF8

$pagesJs = @'

if (window.location.hostname.endsWith('github.io')) {
  setPill(apiStatus, 'Vista publica', 'warn');
  setPill(wsStatus, 'Backend local requerido', 'warn');
}
'@

Add-Content -LiteralPath (Join-Path $docsStatic "app.js") -Value $pagesJs -Encoding UTF8

Write-Host "GitHub Pages sincronizado en: $docs"
Write-Host "Siguiente paso: git add docs sync-pages.ps1"
