<?php
declare(strict_types=1);

const INFO_BASE = 'https://ymyrdyuwrtborbpcrswx.supabase.co/functions/v1/s/';
const FALLBACK_IMAGE = 'https://grupopietra.com/tools/wsp-ncs/images/whatsapp-512.png';
const PAGE_BASE = 'https://grupopietra.com/tools/wsp-ncs/view.php?c=';

function fail(int $status, string $message): void {
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
}

function shareCode(): string {
    $raw = $_GET['c'] ?? '';
    if (!is_string($raw)) {
        return '';
    }
    if (preg_match('~/s/([0-9A-Za-z]{8})(?:/|[?#]|$)~', $raw, $match)) {
        return $match[1];
    }
    if (preg_match('/^[0-9A-Za-z]{8}$/', $raw)) {
        return $raw;
    }
    return '';
}

function fetchInfo(string $code): ?array {
    $url = INFO_BASE . rawurlencode($code) . '/info';
    $body = false;
    $status = 0;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'timeout' => 15,
                'header' => "Accept: application/json\r\n",
                'ignore_errors' => true,
            ],
        ]);
        $body = @file_get_contents($url, false, $context);
        $statusLine = $http_response_header[0] ?? '';
        if (preg_match('/\s(\d{3})\s/', $statusLine, $match)) {
            $status = (int) $match[1];
        }
    }

    if (!is_string($body) || $status !== 200) {
        return null;
    }
    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

function httpsUrl(mixed $value): string {
    if (!is_string($value) || !preg_match('#^https://#', $value)) {
        return '';
    }
    return $value;
}

function h(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$code = shareCode();
if ($code === '') {
    fail(404, 'No se encontró el archivo');
}

$info = fetchInfo($code);
$fileUrl = httpsUrl($info['file_url'] ?? '');
$filename = is_array($info) && is_string($info['filename'] ?? null) ? $info['filename'] : '';
if ($info === null || $fileUrl === '' || $filename === '') {
    fail(404, 'No se encontró el archivo');
}

$contentType = is_string($info['content_type'] ?? null) ? $info['content_type'] : '';
$previewUrl = httpsUrl($info['preview_url'] ?? '');
$usesFallback = $previewUrl === '';
if ($usesFallback) {
    $previewUrl = FALLBACK_IMAGE;
}
$width = $usesFallback ? 512 : (int) ($info['preview_width'] ?? 0);
$height = $usesFallback ? 512 : (int) ($info['preview_height'] ?? 0);
$imageType = $usesFallback ? 'image/png' : 'image/jpeg';
$pageUrl = PAGE_BASE . rawurlencode($code);
$description = 'Disponible durante 10 días.';
$sizeMeta = ($width > 0 && $height > 0)
    ? '<meta property="og:image:width" content="' . $width . '">' . "\n"
        . '<meta property="og:image:height" content="' . $height . '">'
    : '';

if (strncmp($contentType, 'image/', 6) === 0) {
    $media = '<img src="' . h($fileUrl) . '" alt="' . h($filename) . '">';
} elseif (strncmp($contentType, 'video/', 6) === 0) {
    $media = '<video src="' . h($fileUrl) . '" controls playsinline></video>';
} else {
    $media = '';
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=300');
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($filename) ?></title>
<meta property="og:type" content="website">
<meta property="og:title" content="<?= h($filename) ?>">
<meta property="og:description" content="<?= h($description) ?>">
<meta property="og:url" content="<?= h($pageUrl) ?>">
<meta property="og:image" content="<?= h($previewUrl) ?>">
<meta property="og:image:secure_url" content="<?= h($previewUrl) ?>">
<meta property="og:image:type" content="<?= h($imageType) ?>">
<meta property="og:image:alt" content="<?= h($filename) ?>">
<?= $sizeMeta ?>
<style>
  body { margin: 0; font-family: sans-serif; background: #f6f7f8; color: #222; }
  main { max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
  img, video { display: block; max-width: 100%; height: auto; margin: 0 auto 16px; border-radius: 12px; background: #fff; }
  h1 { font-size: 1.1rem; font-weight: 600; word-break: break-word; }
  p { color: #666; }
  a.file { display: inline-block; margin-top: 8px; background: #128C7E; color: #fff; text-decoration: none; padding: 12px 16px; border-radius: 8px; }
</style>
</head>
<body>
<main>
  <?= $media ?>
  <h1><?= h($filename) ?></h1>
  <p><?= h($description) ?></p>
  <a class="file" href="<?= h($fileUrl) ?>">Abrir archivo</a>
</main>
</body>
</html>
