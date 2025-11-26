<?php

namespace App\Actions;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class SaveImageFromSource
{
  /**
   * Salva o conteúdo de uma imagem no disco, suportando Base64 (Data URL) ou URL de download.
   *
   * @param string $source O valor de saída (Base64 Data URL ou link).
   * @param string|int $userId ID do usuário para prefixo.
   * @param string $suffix Sufixo do nome do arquivo (ex: '_upscale_return').
   * @param string $diskPath O caminho dentro do disco 'public' (ex: 'temp/').
   * @return string|null O nome do arquivo salvo (incluindo extensão) ou null em caso de falha.
   */
  public function __invoke(string $source,  $userId, string $suffix, string $diskPath = 'temp/')
  {
    if (empty($source)) {
      return null;
    }

    $imageBinary = null;
    $fileExtension = 'jpg';
    $fileNamePrefix = $userId . $suffix;

    if (substr($source, 0, 5) == 'data:') {
      // Lógica para Base64 (Data URL)
      $base64Content = preg_replace('/^data:image\/\w+;base64,/', '', $source);
      $imageBinary = base64_decode($base64Content);
      Log::info('📦 Imagem processada como Base64.');
    } elseif (filter_var($source, FILTER_VALIDATE_URL)) {
      // Lógica para URL de Download
      try {
        $imageResponse = Http::get($source);

        if ($imageResponse->successful()) {
          $imageBinary = $imageResponse->body();
          // Obtém a extensão do arquivo da URL (ex: webp, jpg)
          $pathInfo = pathinfo($source);
          $fileExtension = $pathInfo['extension'] ?? 'jpg';
          Log::info('📦 Imagem baixada da URL Replicate.', ['url' => $source]);
        } else {
          Log::warning('⚠️ Falha ao baixar imagem da URL externa.', ['url' => $source, 'status' => $imageResponse->status()]);
          return null;
        }
      } catch (\Exception $e) {
        Log::error('💥 Erro ao tentar baixar imagem da URL.', ['url' => $source, 'error' => $e->getMessage()]);
        return null;
      }
    }

    // 3. Salva no disco, se o binário foi obtido
    if ($imageBinary) {
      $finalFileName = $fileNamePrefix . '.' . $fileExtension;
      Storage::disk('public')->put($diskPath . $finalFileName, $imageBinary);
      return $finalFileName;
    }

    return null;
  }
}
