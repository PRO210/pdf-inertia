<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
// use Intervention\Image\ImageManager;
// use Intervention\Image\Drivers\Gd\Driver;


class PdfEditorController extends Controller
{
    public function index()
    {
        return Inertia::render('PdfEditor');
    }

    public function store(Request $request)
    {

        if ($request->hasFile('pdf')) {
            $pdf = $request->file('pdf');
            $filename = $pdf->getClientOriginalName();
            $pdf->storeAs('public/pdfs', $filename);

            $url = asset('storage/pdfs/' . $filename); // URL acessível no frontend

            return response()->json([
                'success' => true,
                'url' => $url
            ]);
        }

        return response()->json(['error' => 'Nenhum arquivo enviado.'], 400);
    }

    /* Em produção e muita rápida mas pixeliza em cartaz maior que 6 */
    // public function cortarImagem(Request $request)
    // {
    //     $base64 = $request->input('imagem');
    //     $colunas = (int) $request->input('colunas', 2);
    //     $linhas = (int) $request->input('linhas', 2);
    //     $orientacao = $request->input('orientacao', 'retrato');
    //     $aspecto = filter_var($request->input('aspecto', true), FILTER_VALIDATE_BOOLEAN);

    //     // Decodifica a imagem base64
    //     $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64));

    //     try {
    //         $imagick = new \Imagick();
    //         $imagick->readImageBlob($imageData);
    //     } catch (\ImagickException $e) {
    //         return response()->json(['error' => 'Imagem inválida.'], 422);
    //     }

    //     // Dimensões da folha A4 em polegadas
    //     $larguraFolhaIn = $orientacao === 'retrato' ? 8.27 : 11.69;
    //     $alturaFolhaIn  = $orientacao === 'retrato' ? 11.69 : 8.27;

    //     // Pixels da imagem original
    //     $imgWidthPx = $imagick->getImageWidth();
    //     $imgHeightPx = $imagick->getImageHeight();

    //     // Calcula DPI mínimo baseado na imagem original e tamanho do pôster
    //     $dpiLargura = intval($imgWidthPx / ($larguraFolhaIn * $colunas));
    //     $dpiAltura  = intval($imgHeightPx / ($alturaFolhaIn * $linhas));
    //     $dpi = max($dpiLargura, $dpiAltura, 150); // garante pelo menos 150 DPI

    //     // Converte tamanho do pôster para pixels com base no DPI calculado
    //     $larguraFolhaPx = intval($larguraFolhaIn * $dpi);
    //     $alturaFolhaPx  = intval($alturaFolhaIn * $dpi);

    //     // Tamanho de cada tile
    //     $larguraAlvo = intval($larguraFolhaPx / $colunas);
    //     $alturaAlvo  = intval($alturaFolhaPx / $linhas);

    //     // Redimensiona a imagem inteira para múltiplos exatos da grade
    //     $larguraIdeal = $colunas * $larguraAlvo;
    //     $alturaIdeal  = $linhas  * $alturaAlvo;
    //     $imagick->resizeImage($larguraIdeal, $alturaIdeal, \Imagick::FILTER_LANCZOS, 1, false);

    //     $imagick->sharpenImage(0.5, 0.3);

    //     $larguraParte = intval($imagick->getImageWidth() / $colunas);
    //     $alturaParte  = intval($imagick->getImageHeight() / $linhas);

    //     $partes = [];

    //     // for ($y = 0; $y < $linhas; $y++) {
    //     //     for ($x = 0; $x < $colunas; $x++) {
    //     //         $recorte = clone $imagick;
    //     //         $recorte->cropImage($larguraParte, $alturaParte, $x * $larguraParte, $y * $alturaParte);

    //     //         $canvas = new \Imagick();
    //     //         $canvas->newImage($larguraAlvo, $alturaAlvo, new \ImagickPixel("white"));
    //     //         $canvas->setImageFormat("png");

    //     //         if ($aspecto) {
    //     //             $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, true);
    //     //             $xOffset = intval(($larguraAlvo - $recorte->getImageWidth()) / 2);
    //     //             $yOffset = intval(($alturaAlvo - $recorte->getImageHeight()) / 2);
    //     //             $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, $xOffset, $yOffset);
    //     //         } else {
    //     //             $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, false);
    //     //             $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, 0, 0);
    //     //         }

    //     //         $partes[] = 'data:image/png;base64,' . base64_encode($canvas->getImageBlob());

    //     //         $recorte->clear();
    //     //         $canvas->clear();
    //     //     }
    //     // }
    //     for ($y = 0; $y < $linhas; $y++) {
    //         for ($x = 0; $x < $colunas; $x++) {
    //             $recorte = clone $imagick;
    //             $recorte->cropImage($larguraParte, $alturaParte, $x * $larguraParte, $y * $alturaParte);

    //             // 🔹 Aplica uma borda mínima branca e leve desfoque nas bordas
    //             $recorte->borderImage(new \ImagickPixel('white'), 1, 1);
    //             $recorte->gaussianBlurImage(0.3, 0.3); // suaviza bordas sem perder nitidez

    //             $canvas = new \Imagick();
    //             $canvas->newImage($larguraAlvo, $alturaAlvo, new \ImagickPixel("white"));
    //             $canvas->setImageFormat("png");

    //             if ($aspecto) {
    //                 $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, true);
    //                 $xOffset = intval(($larguraAlvo - $recorte->getImageWidth()) / 2);
    //                 $yOffset = intval(($alturaAlvo - $recorte->getImageHeight()) / 2);
    //                 $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, $xOffset, $yOffset);
    //             } else {
    //                 $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, false);
    //                 $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, 0, 0);
    //             }

    //             $partes[] = 'data:image/png;base64,' . base64_encode($canvas->getImageBlob());

    //             $recorte->clear();
    //             $canvas->clear();
    //         }
    //     }

    //     $imagick->clear();

    //     return response()->json([
    //         'partes' => $partes,
    //         'dpi' => $dpi
    //     ]);
    // }
    
    /*Em produção o único problema é que o redimensionamento está apliando pouco e não toda a folha  */
    // public function cortarImagem(Request $request)
    // {
    //     $base64     = $request->input('imagem');
    //     $colunas    = (int) $request->input('colunas', 2);
    //     $linhas     = (int) $request->input('linhas', 2);
    //     $orientacao = $request->input('orientacao', 'retrato');
    //     $aspecto    = filter_var($request->input('aspecto', true), FILTER_VALIDATE_BOOLEAN);

    //     // Variável de debug
    //     $tamanhosDebug = [];

    //     // Decodifica qualquer imagem base64
    //     $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64));

    //     try {
    //         $imagick = new \Imagick();
    //         $imagick->readImageBlob($imageData);
    //         $imagick->setImageColorspace(\Imagick::COLORSPACE_RGB);
    //     } catch (\ImagickException $e) {
    //         return response()->json(['error' => 'Imagem inválida.'], 422);
    //     }

    //     // Dimensões A4 em polegadas
    //     $larguraFolhaIn = $orientacao === 'retrato' ? 8.27 : 11.69;
    //     $alturaFolhaIn  = $orientacao === 'retrato' ? 11.69 : 8.27;

    //     $tamanhosDebug[] = ['larguraFolhaIn' => $larguraFolhaIn];
    //     $tamanhosDebug[] = ['alturaFolhaIn' => $alturaFolhaIn];

    //     $imgWidthPx  = $imagick->getImageWidth();
    //     $imgHeightPx = $imagick->getImageHeight();

    //     $tamanhosDebug[] = ['imgWidthPx' => $imgWidthPx];
    //     $tamanhosDebug[] = ['imgHeightPx' => $imgHeightPx];

    //     // Calcula DPI baseado no menor lado do tile
    //     $dpiX = $imgWidthPx / ($larguraFolhaIn * $colunas);
    //     $dpiY = $imgHeightPx / ($alturaFolhaIn * $linhas);
    //     $dpi  = (int) max(72, round(min($dpiX, $dpiY)));

    //     $tamanhosDebug[] = ['dpiX' => $dpiX];
    //     $tamanhosDebug[] = ['dpiY' => $dpiY];
    //     $tamanhosDebug[] = ['dpi' => $dpi];

    //     if ($aspecto) {
    //         $larguraAlvo = (int) round($larguraFolhaIn * $dpi);
    //         $alturaAlvo  = (int) round($alturaFolhaIn  * $dpi);
    //     } else {
    //         $larguraAlvo = (int) round($larguraFolhaIn * $dpiX);
    //         $alturaAlvo  = (int) round($alturaFolhaIn  * $dpiY);
    //     }


    //     $tamanhosDebug[] = ['larguraAlvo' => $larguraAlvo];
    //     $tamanhosDebug[] = ['alturaAlvo' => $alturaAlvo];

    //     // Define limites de corte
    //     $xBounds = [];
    //     $yBounds = [];
    //     for ($i = 0; $i <= $colunas; $i++) $xBounds[$i] = (int) round($i * $imgWidthPx / $colunas);
    //     for ($j = 0; $j <= $linhas; $j++) $yBounds[$j] = (int) round($j * $imgHeightPx / $linhas);

    //     $imagick->sharpenImage(0.5, 0.3);

    //     $partes = [];
    //     $larguraConteudoCm = 0;
    //     $alturaConteudoCm = 0;

    //     for ($y = 0; $y < $linhas; $y++) {
    //         for ($x = 0; $x < $colunas; $x++) {

    //             $x0 = $xBounds[$x];
    //             $x1 = $xBounds[$x + 1];
    //             $y0 = $yBounds[$y];
    //             $y1 = $yBounds[$y + 1];

    //             $recorte = $imagick->getImageRegion($x1 - $x0, $y1 - $y0, $x0, $y0);

    //             // Redimensiona somente o recorte
    //             if ($aspecto) {
    //                 $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, true);
    //             } else {
    //                 $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, false);
    //             }

    //             // Canvas JPEG
    //             $canvas = new \Imagick();
    //             $canvas->newImage($larguraAlvo, $alturaAlvo, new \ImagickPixel("white"));
    //             $canvas->setImageFormat('jpeg');
    //             $canvas->setImageCompression(\Imagick::COMPRESSION_JPEG);
    //             $canvas->setImageCompressionQuality(100);
    //             $canvas->setImageUnits(\Imagick::RESOLUTION_PIXELSPERINCH);
    //             $canvas->setImageResolution($dpi, $dpi);

    //             // Centraliza se aspecto
    //             $xOffset = (int) floor(($larguraAlvo - $recorte->getImageWidth()) / 2);
    //             $yOffset = (int) floor(($alturaAlvo - $recorte->getImageHeight()) / 2);
    //             $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, $xOffset, $yOffset);

    //             $partes[] = 'data:image/jpeg;base64,' . base64_encode($canvas->getImageBlob());

    //             // Obtém as dimensões em pixels do recorte após o redimensionamento
    //             $larguraConteudoPx = $recorte->getImageWidth();
    //             $alturaConteudoPx = $recorte->getImageHeight();

    //             $tamanhosDebug[] = ['larguraConteudoPx' => $larguraConteudoPx];
    //             $tamanhosDebug[] = ['alturaConteudoPx' => $alturaConteudoPx];

    //             // Converte essas dimensões para centímetros
    //             $larguraConteudoCm = round($larguraConteudoPx / $dpi * 2.54, 2);
    //             $alturaConteudoCm = round($alturaConteudoPx / $dpi * 2.54, 2);

    //             $tamanhosDebug[] = ['larguraConteudoCm' => $larguraConteudoCm - 2];
    //             $tamanhosDebug[] = ['alturaConteudoCm' => $alturaConteudoCm - 2];

    //             $recorte->clear();
    //             $canvas->clear();
    //         }
    //     }

    //     $imagick->clear();

    //     return response()->json([
    //         'partes' => $partes,
    //         'dpi' => $dpi,
    //         // 'tile_px' => [
    //         //     'largura' => $larguraAlvo,
    //         //     'altura' => $alturaAlvo
    //         // ],
    //         // 'conteudo_cm' => [
    //         //     'largura' => $larguraConteudoCm - 2,
    //         //     'altura' => $alturaConteudoCm - 2
    //         // ],
    //         'tamanhos_debug' => $tamanhosDebug // 🔹 array de debug
    //     ]);
    // }

    public function cortarImagem(Request $request)
    {
        $base64     = $request->input('imagem');
        $colunas    = (int) $request->input('colunas', 2);
        $linhas     = (int) $request->input('linhas', 2);
        $orientacao = $request->input('orientacao', 'retrato');
        $aspecto    = filter_var($request->input('aspecto', true), FILTER_VALIDATE_BOOLEAN);

        // Variável de debug
        $tamanhosDebug = [];

        // Decodifica qualquer imagem base64
        $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64));

        try {
            $imagick = new \Imagick();
            $imagick->readImageBlob($imageData);
            $imagick->setImageColorspace(\Imagick::COLORSPACE_RGB);
        } catch (\ImagickException $e) {
            return response()->json(['error' => 'Imagem inválida.'], 422);
        }

        // Dimensões A4 em polegadas
        $larguraFolhaIn = $orientacao === 'retrato' ? 8.27 : 11.69;
        $alturaFolhaIn  = $orientacao === 'retrato' ? 11.69 : 8.27;

        $tamanhosDebug[] = ['larguraFolhaIn' => $larguraFolhaIn];
        $tamanhosDebug[] = ['alturaFolhaIn' => $alturaFolhaIn];

        $imgWidthPx  = $imagick->getImageWidth();
        $imgHeightPx = $imagick->getImageHeight();

        $tamanhosDebug[] = ['imgWidthPx' => $imgWidthPx];
        $tamanhosDebug[] = ['imgHeightPx' => $imgHeightPx];

        // 🔹 DPI baseado em cada eixo
        $dpiX = $imgWidthPx / ($larguraFolhaIn * $colunas);
        $dpiY = $imgHeightPx / ($alturaFolhaIn * $linhas);
        $dpi  = (int) max(72, round(min($dpiX, $dpiY)));

        $tamanhosDebug[] = ['dpiX' => $dpiX];
        $tamanhosDebug[] = ['dpiY' => $dpiY];
        $tamanhosDebug[] = ['dpi' => $dpi];

        // 🔹 Margem em cm
        $margemCm = 2;

        if ($aspecto) {
            // proporcional (mantém como estava)
            $larguraAlvo = (int) round($larguraFolhaIn * $dpi);
            $alturaAlvo  = (int) round($alturaFolhaIn * $dpi);
        } else {
            // estica para caber no A4 inteiro menos margem
            $dpiConstante = 72; // ou 150 se quiser mais leve
            $larguraAlvo = (int) round(($larguraFolhaIn - ($margemCm / 2.54)) * $dpiConstante);
            $alturaAlvo  = (int) round(($alturaFolhaIn  - ($margemCm / 2.54)) * $dpiConstante);
            $dpi = $dpiConstante;
        }

        $tamanhosDebug[] = ['larguraAlvo' => $larguraAlvo];
        $tamanhosDebug[] = ['alturaAlvo' => $alturaAlvo];

        // Define limites de corte
        $xBounds = [];
        $yBounds = [];
        for ($i = 0; $i <= $colunas; $i++) $xBounds[$i] = (int) round($i * $imgWidthPx / $colunas);
        for ($j = 0; $j <= $linhas; $j++) $yBounds[$j] = (int) round($j * $imgHeightPx / $linhas);

        $imagick->sharpenImage(0.5, 0.3);

        $partes = [];
        $larguraConteudoCm = 0;
        $alturaConteudoCm = 0;

        for ($y = 0; $y < $linhas; $y++) {
            for ($x = 0; $x < $colunas; $x++) {

                $x0 = $xBounds[$x];
                $x1 = $xBounds[$x + 1];
                $y0 = $yBounds[$y];
                $y1 = $yBounds[$y + 1];

                $recorte = $imagick->getImageRegion($x1 - $x0, $y1 - $y0, $x0, $y0);

                // Redimensiona somente o recorte
                if ($aspecto) {
                    $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, true);
                } else {
                    $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, false);
                }

                // Canvas JPEG
                $canvas = new \Imagick();
                $canvas->newImage($larguraAlvo, $alturaAlvo, new \ImagickPixel("white"));
                $canvas->setImageFormat('jpeg');
                $canvas->setImageCompression(\Imagick::COMPRESSION_JPEG);
                $canvas->setImageCompressionQuality(90);
                $canvas->setImageUnits(\Imagick::RESOLUTION_PIXELSPERINCH);
                $canvas->setImageResolution($dpi, $dpi);

                // Centraliza se aspecto
                $xOffset = (int) floor(($larguraAlvo - $recorte->getImageWidth()) / 2);
                $yOffset = (int) floor(($alturaAlvo - $recorte->getImageHeight()) / 2);
                $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, $xOffset, $yOffset);

                $partes[] = 'data:image/jpeg;base64,' . base64_encode($canvas->getImageBlob());

                // Obtém as dimensões em pixels do recorte após o redimensionamento
                $larguraConteudoPx = $recorte->getImageWidth();
                $alturaConteudoPx = $recorte->getImageHeight();

                $tamanhosDebug[] = ['larguraConteudoPx' => $larguraConteudoPx];
                $tamanhosDebug[] = ['alturaConteudoPx' => $alturaConteudoPx];

                // Converte essas dimensões para centímetros
                $larguraConteudoCm = round($larguraConteudoPx / $dpi * 2.54, 2);
                $alturaConteudoCm = round($alturaConteudoPx / $dpi * 2.54, 2);

                $tamanhosDebug[] = ['larguraConteudoCm' => $larguraConteudoCm];
                $tamanhosDebug[] = ['alturaConteudoCm' => $alturaConteudoCm];

                $recorte->clear();
                $canvas->clear();
            }
        }

        $imagick->clear();

        return response()->json([
            'partes' => $partes,
            'dpi' => $dpi,
            'tamanhos_debug' => $tamanhosDebug // 🔹 array de debug
        ]);
    }


    public function atividades()
    {
        return Inertia::render('PdfAtividades');
    }
}
