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

    //     // Dimensões reais da imagem
    //     $imgWidthPx  = $imagick->getImageWidth();
    //     $imgHeightPx = $imagick->getImageHeight();

    //     // Calculo DPI baseado em cada eixo
    //     $dpiX = $imgWidthPx / ($larguraFolhaIn * $colunas);
    //     $dpiY = $imgHeightPx / ($alturaFolhaIn * $linhas);
    //     $dpi  = (int) round(min($dpiX, $dpiY));

    //     // Ajuste do limite máximo adaptativo baseado no total de células (colunas x linhas)
    //     $totalCelulas = $colunas * $linhas;

    //     $maxDpi = match (true) {
    //         $totalCelulas <= 16 => 150,     // Poster pequeno (até 4x4)
    //         $totalCelulas <= 36 => 120,     // Poster médio (até 6x6)
    //         $totalCelulas <= 64 => 96,      // Poster grande (até 8x8)
    //         default            => 82,       // Poster gigante (maior que 8x8)
    //     };

    //     // Limites mínimos e máximos fixos
    //     $minDpi = 72;

    //     // Mantém o DPI entre o mínimo e máximo adaptativo
    //     $dpi = max($minDpi, min($dpi, $maxDpi));

    //     // Margem em cm
    //     $margemCm = 2;

    //     if ($aspecto) {
    //         // proporcional (mantém proporção da imagem)
    //         $larguraAlvo = (int) round($larguraFolhaIn * $dpi);
    //         $alturaAlvo  = (int) round($alturaFolhaIn  * $dpi);
    //     } else {
    //         // estica para caber no A4 inteiro menos margem
    //         $larguraAlvo = (int) round(($larguraFolhaIn - ($margemCm / 2.54)) * $dpi);
    //         $alturaAlvo  = (int) round(($alturaFolhaIn  - ($margemCm / 2.54)) * $dpi);
    //     }

    //     // Debug info
    //     $tamanhosDebug[] = ['larguraFolhaIn' => $larguraFolhaIn];
    //     $tamanhosDebug[] = ['alturaFolhaIn' => $alturaFolhaIn];
    //     $tamanhosDebug[] = ['imgWidthPx' => $imgWidthPx];
    //     $tamanhosDebug[] = ['imgHeightPx' => $imgHeightPx];
    //     $tamanhosDebug[] = ['dpiX' => round($dpiX, 2)];
    //     $tamanhosDebug[] = ['dpiY' => round($dpiY, 2)];
    //     $tamanhosDebug[] = ['dpi final' => $dpi];
    //     $tamanhosDebug[] = ['maxDpi' => $maxDpi];
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
    //             $canvas->setImageCompressionQuality(80);
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

    //             $tamanhosDebug[] = ['larguraConteudoCm' => $larguraConteudoCm];
    //             $tamanhosDebug[] = ['alturaConteudoCm' => $alturaConteudoCm];

    //             $recorte->clear();
    //             $canvas->clear();
    //         }
    //     }

    //     $imagick->clear();

    //     return response()->json([
    //         'partes' => $partes,
    //         'dpi' => $dpi,
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

        // Dimensões reais da imagem
        $imgWidthPx  = $imagick->getImageWidth();
        $imgHeightPx = $imagick->getImageHeight();

        $tamanhosDebug[] = ['imgWidthPx' => $imgWidthPx];
        $tamanhosDebug[] = ['imgHeightPx' => $imgHeightPx];

        // 🔹 Calcula DPI real em cada eixo
        $dpiX = $imgWidthPx / ($larguraFolhaIn * $colunas);
        $dpiY = $imgHeightPx / ($alturaFolhaIn * $linhas);
        $dpi  = (int) round(min($dpiX, $dpiY));

        // // 🔹 Limite superior adaptativo conforme tamanho do pôster
        // $maxDpi = match (true) {
        //     $colunas <= 2 => 144,  // pôster pequeno
        //     $colunas <= 3 => 100,  // pequeno
        //     $colunas <= 4 => 100,  // médio
        //     $colunas <= 5 => 100,  // médio
        //     $colunas <= 6 => 100,   // grande
        //     $colunas <= 8 => 100,  // grande
        //     default       => 82,  // gigante (até 10x10)
        // };

        // 🔹 DPI mínimo adaptativo (evita pixelização em imagens pequenas)
        $minDpi = match (true) {
            $colunas <= 2 => 72,   // pôster pequeno, imagem pequena precisa de mais nitidez
            $colunas <= 4 => 60,   // médio
            $colunas <= 6 => 50,   // grande
            default       => 40,   // muito grande, não precisa forçar DPI
        };

        // 🔹 Define limite de DPI de forma proporcional conforme o tamanho (colunas/folhas)
        // $minDpi = 72;   // limite inferior (outdoors, 100 folhas)
        $maxDpi = 150;  // limite superior (pequeno, A4–A3)
        $maxColunas = 100; // limite máximo considerado

        // Calcula o DPI de forma inversamente proporcional ao número de colunas
        $maxDpi = max(
            $minDpi,
            round($maxDpi - (($colunas - 1) / ($maxColunas - 1)) * ($maxDpi - $minDpi))
        );

        // 🔹 Aplica o DPI final dentro dos limites
        $dpi = max($minDpi, min($dpi, $maxDpi));

        // 🔹 Margem em cm
        $margemCm = 2;

        if ($aspecto) {
            // proporcional (mantém proporção da imagem)
            $larguraAlvo = (int) round($larguraFolhaIn * $dpi);
            $alturaAlvo  = (int) round($alturaFolhaIn  * $dpi);
        } else {
            // estica para caber no A4 inteiro menos margem
            $larguraAlvo = (int) round(($larguraFolhaIn - ($margemCm / 2.54)) * $dpi);
            $alturaAlvo  = (int) round(($alturaFolhaIn  - ($margemCm / 2.54)) * $dpi);
        }

        // 🔹 Debug opcional
        $tamanhosDebug[] = [
            'dpiX' => round($dpiX, 2),
            'dpiY' => round($dpiY, 2),
            'dpiFinal' => $dpi,
            'minDpi' => $minDpi,
            'maxDpi' => $maxDpi,
        ];

        // $tamanhosDebug[] = ['larguraAlvo(px)' => $larguraAlvo];
        // $tamanhosDebug[] = ['alturaAlvo(px)' => $alturaAlvo];

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
                $canvas->setImageCompressionQuality(85);
                $canvas->setImageUnits(\Imagick::RESOLUTION_PIXELSPERINCH);
                $canvas->setImageResolution($dpi, $dpi);

                // Centraliza se aspecto
                // $xOffset = (int) floor(($larguraAlvo - $recorte->getImageWidth()) / 2);
                // $yOffset = (int) floor(($alturaAlvo - $recorte->getImageHeight()) / 2);
                $xOffset = 0;
                $yOffset = 0;
                $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, $xOffset, $yOffset);

                $partes[] = 'data:image/jpeg;base64,' . base64_encode($canvas->getImageBlob());

                // Obtém as dimensões em pixels do recorte após o redimensionamento
                // $larguraConteudoPx = $recorte->getImageWidth();
                // $alturaConteudoPx = $recorte->getImageHeight();

                // $tamanhosDebug[] = ['larguraConteudoPx' => $larguraConteudoPx];
                // $tamanhosDebug[] = ['alturaConteudoPx' => $alturaConteudoPx];

                // Converte essas dimensões para centímetros
                // $larguraConteudoCm = round($larguraConteudoPx / $dpi * 2.54, 2);
                // $alturaConteudoCm = round($alturaConteudoPx / $dpi * 2.54, 2);

                // $tamanhosDebug[] = ['larguraConteudoCm' => $larguraConteudoCm];
                // $tamanhosDebug[] = ['alturaConteudoCm' => $alturaConteudoCm];

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
