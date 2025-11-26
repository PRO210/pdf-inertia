<?php

namespace App\Actions;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class CleanUserUpscaleFiles
{
  /**
   * Remove todos os arquivos temporários de upscale associados a um prefixo de nome (ID do usuário)
   * e sufixo (método) específicos, independentemente da extensão.
   *
   * @param string|int $prefix O prefixo do nome do arquivo (neste caso, o ID do usuário).
   * @param string $suffix Sufixo do nome do arquivo (ex: '_upscale_original' ou '_upscale_return').
   * @param string $diskPath O caminho dentro do disco 'public/' (ex: 'temp/').
   * @return int O número de arquivos removidos.
   */
  public function __invoke($prefix, string $suffix, string $diskPath = 'temp/')
  {
    // 1. Define o padrão de busca, usando o prefixo e sufixo exatos e o curinga para extensão.
    // Exemplo gerado: 'temp/123_upscale_original.*'
    $pattern = $diskPath . $prefix . $suffix . '.*';

    // 2. Busca os arquivos que correspondem ao padrão
    // O método glob() suporta curingas (*) no caminho/nome do arquivo.
    $fullPath = Storage::disk('public')->path($diskPath . $prefix . $suffix . '.*');
    $filesToDelete = glob($fullPath);

    $deletedCount = 0;
    if (!empty($filesToDelete)) {
      // 3. Deleta os arquivos encontrados
      Storage::disk('public')->delete($filesToDelete);
      $deletedCount = count($filesToDelete);
    }

    Log::info("✅ Limpeza de arquivos de upscale concluída.", [
      'prefixo' => $prefix,
      'suffix' => $suffix,
      'count' => $deletedCount
    ]);

    return $deletedCount;
  }
}
