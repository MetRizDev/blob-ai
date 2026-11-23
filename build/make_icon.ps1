Add-Type -AssemblyName System.Drawing

$size = 256
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.Clear([System.Drawing.Color]::Transparent)

$circle = New-Object System.Drawing.Drawing2D.GraphicsPath
$circle.AddEllipse(8, 8, 240, 240)
$gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point(30, 20)),
  (New-Object System.Drawing.Point(230, 240)),
  [System.Drawing.Color]::FromArgb(255, 255, 234, 130),
  [System.Drawing.Color]::FromArgb(255, 255, 138, 31)
)
$graphics.FillPath($gradient, $circle)

$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 253, 247))
$dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 58, 24, 8))

$graphics.FillEllipse($white, 66, 72, 46, 58)
$graphics.FillEllipse($white, 144, 72, 46, 58)
$graphics.FillEllipse($dark, 88, 92, 20, 28)
$graphics.FillEllipse($dark, 152, 92, 20, 28)

$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 58, 24, 8), 10)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawArc($pen, 88, 138, 80, 48, 12, 156)

$graphics.Dispose()

$pngPath = Join-Path $PSScriptRoot 'icon.png'
$icoPath = Join-Path $PSScriptRoot 'icon.ico'
$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($stream)
$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]1)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([uint16]1)
$writer.Write([uint16]32)
$writer.Write([uint32]$pngBytes.Length)
$writer.Write([uint32]22)
$writer.Write($pngBytes)
$writer.Flush()
[System.IO.File]::WriteAllBytes($icoPath, $stream.ToArray())
$writer.Dispose()
$stream.Dispose()
$bitmap.Dispose()

Write-Output "Created $pngPath and $icoPath"
