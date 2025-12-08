<?php

namespace App\Helpers;

use TCPDF;

class ImageToMask
{


  /**
   * Gera PDF com grade de imagens, mantendo proporções e com margens.
   *
   * @param array $imagens - array de arquivos UploadedFile
   * @param array $config  - opções de orientação, colunas, linhas e margem
   * @return string - caminho do PDF gerado
   */
  public static function gerarPdf(array $imagens, array $config = [])
  {
    if (empty($imagens)) {
      throw new \Exception("Nenhuma imagem enviada.");
    }

    // CONFIG PADRÃO
    $orientacao = $config['orientacao'] ?? 'paisagem'; // paisagem | retrato
    $numCols    = max(1, intval($config['colunas'] ?? 2));
    $numRows    = max(1, intval($config['linhas'] ?? 2));
    $margemCm   = floatval($config['margem_cm'] ?? 0.5);

    // Dimensões A4 em mm
    $A4_W = 210;
    $A4_H = 297;

    // Ajusta orientação
    if ($orientacao === 'retrato') {
      $pageW = $A4_W;
      $pageH = $A4_H;
      $orientationCode = 'P';
    } else {
      $pageW = $A4_H;
      $pageH = $A4_W;
      $orientationCode = 'L';
    }

    // Margem
    $margemMm = $margemCm * 10;
    $gap = 0.25;


    // Caixa útil
    $usableW = $pageW - 2 * $margemMm;
    $usableH = $pageH - 2 * $margemMm;

    // Célula
    $cellW = $usableW / $numCols;
    $cellH = $usableH / $numRows;

    // Cria PDF
    $pdf = new TCPDF($orientationCode, 'mm', 'A4', true, 'UTF-8', false);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetAutoPageBreak(false);

    $perPage = $numCols * $numRows;
    $i = 0;

    foreach ($imagens as $file) {

      if ($i % $perPage === 0) {
        $pdf->AddPage();
      }

      // --- APLICAR MÁSCARA ANTES DE COLOCAR NO PDF ---
      $originalImage = $file->getRealPath();

      // exemplo: pegue sempre a mesma máscara
      $maskFile = public_path('imagens/mascaras/coracao.png');

      // processa a imagem e retorna um arquivo PNG mascarado
      $imgPath = MascaraHelper::aplicarMascara($originalImage, $maskFile);
      // -------------------------------------------------

      [$pxW, $pxH] = getimagesize($imgPath);


      $pos = $i % $perPage;
      $col = $pos % $numCols;
      $row = intdiv($pos, $numCols);

      $xCell = $margemMm + $col * $cellW;
      $yCell = $margemMm + $row * $cellH;


      // $imgPath = $file->getRealPath();
      // [$pxW, $pxH] = getimagesize($imgPath);

      if ($pxH == 0) $pxH = 1;

      // // Aspect ratios
      // $imgAspect  = $pxW / $pxH;
      // $cellAspect = $cellW / $cellH;

      // if ($imgAspect > $cellAspect) {
      //   $drawW = $cellW;
      //   $drawH = $cellW / $imgAspect;
      // } else {
      //   $drawH = $cellH;
      //   $drawW = $cellH * $imgAspect;
      // }
      // Centralização
      // $drawX = $xCell + ($cellW - $drawW) / 2;
      // $drawY = $yCell + ($cellH - $drawH) / 2;

      $drawW = $cellW - ($gap * 2);
      $drawH = $cellH - ($gap * 2);

      $drawX = $xCell + $gap;
      $drawY = $yCell + $gap;

      $pdf->Image($imgPath, $drawX, $drawY, $drawW, $drawH);

      $i++;
    }

    // Diretório final
    $outputDir = storage_path('app/temp_pdf');
    if (!is_dir($outputDir)) mkdir($outputDir, 0777, true);

    // $outputFile = $outputDir . '/pdf_final_' . time() . '.pdf';
    $outputFile = $outputDir . '/pdf_final_' . '.pdf';
    $pdf->Output($outputFile, 'F');

    return $outputFile;
  }
}
