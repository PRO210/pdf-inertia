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


    public function cortarImagem(Request $request)
    {
        $base64 = $request->input('imagem');
        $colunas = (int) $request->input('colunas', 2);
        $linhas = (int) $request->input('linhas', 2);
        $orientacao = $request->input('orientacao', 'retrato');
        $aspecto = filter_var($request->input('aspecto', true), FILTER_VALIDATE_BOOLEAN);

        // Decodifica a imagem base64
        $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64));

        try {
            $imagick = new \Imagick();
            $imagick->readImageBlob($imageData);
        } catch (\ImagickException $e) {
            return response()->json(['error' => 'Imagem inválida.'], 422);
        }

        // Dimensões da folha A4 em polegadas
        $larguraFolhaIn = $orientacao === 'retrato' ? 8.27 : 11.69;
        $alturaFolhaIn  = $orientacao === 'retrato' ? 11.69 : 8.27;

        // Pixels da imagem original
        $imgWidthPx = $imagick->getImageWidth();
        $imgHeightPx = $imagick->getImageHeight();

        // Calcula DPI mínimo baseado na imagem original e tamanho do pôster
        $dpiLargura = intval($imgWidthPx / ($larguraFolhaIn * $colunas));
        $dpiAltura  = intval($imgHeightPx / ($alturaFolhaIn * $linhas));
        $dpi = max($dpiLargura, $dpiAltura, 150); // garante pelo menos 150 DPI

        // Converte tamanho do pôster para pixels com base no DPI calculado
        $larguraFolhaPx = intval($larguraFolhaIn * $dpi);
        $alturaFolhaPx  = intval($alturaFolhaIn * $dpi);

        // Tamanho de cada tile
        $larguraAlvo = intval($larguraFolhaPx / $colunas);
        $alturaAlvo  = intval($alturaFolhaPx / $linhas);

        // Redimensiona a imagem inteira para múltiplos exatos da grade
        $larguraIdeal = $colunas * $larguraAlvo;
        $alturaIdeal  = $linhas  * $alturaAlvo;
        $imagick->resizeImage($larguraIdeal, $alturaIdeal, \Imagick::FILTER_LANCZOS, 1, false);

        $imagick->sharpenImage(0.5, 0.3);

        $larguraParte = intval($imagick->getImageWidth() / $colunas);
        $alturaParte  = intval($imagick->getImageHeight() / $linhas);

        $partes = [];

        // for ($y = 0; $y < $linhas; $y++) {
        //     for ($x = 0; $x < $colunas; $x++) {
        //         $recorte = clone $imagick;
        //         $recorte->cropImage($larguraParte, $alturaParte, $x * $larguraParte, $y * $alturaParte);

        //         $canvas = new \Imagick();
        //         $canvas->newImage($larguraAlvo, $alturaAlvo, new \ImagickPixel("white"));
        //         $canvas->setImageFormat("png");

        //         if ($aspecto) {
        //             $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, true);
        //             $xOffset = intval(($larguraAlvo - $recorte->getImageWidth()) / 2);
        //             $yOffset = intval(($alturaAlvo - $recorte->getImageHeight()) / 2);
        //             $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, $xOffset, $yOffset);
        //         } else {
        //             $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, false);
        //             $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, 0, 0);
        //         }

        //         $partes[] = 'data:image/png;base64,' . base64_encode($canvas->getImageBlob());

        //         $recorte->clear();
        //         $canvas->clear();
        //     }
        // }
        for ($y = 0; $y < $linhas; $y++) {
            for ($x = 0; $x < $colunas; $x++) {
                $recorte = clone $imagick;
                $recorte->cropImage($larguraParte, $alturaParte, $x * $larguraParte, $y * $alturaParte);

                // 🔹 Aplica uma borda mínima branca e leve desfoque nas bordas
                $recorte->borderImage(new \ImagickPixel('white'), 1, 1);
                $recorte->gaussianBlurImage(0.3, 0.3); // suaviza bordas sem perder nitidez

                $canvas = new \Imagick();
                $canvas->newImage($larguraAlvo, $alturaAlvo, new \ImagickPixel("white"));
                $canvas->setImageFormat("png");

                if ($aspecto) {
                    $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, true);
                    $xOffset = intval(($larguraAlvo - $recorte->getImageWidth()) / 2);
                    $yOffset = intval(($alturaAlvo - $recorte->getImageHeight()) / 2);
                    $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, $xOffset, $yOffset);
                } else {
                    $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, false);
                    $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, 0, 0);
                }

                $partes[] = 'data:image/png;base64,' . base64_encode($canvas->getImageBlob());

                $recorte->clear();
                $canvas->clear();
            }
        }

        $imagick->clear();

        return response()->json([
            'partes' => $partes,
            'dpi' => $dpi
        ]);
    }

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

    //     // Pega dimensões originais
    //     $larguraImagem = $imagick->getImageWidth();
    //     $alturaImagem  = $imagick->getImageHeight();

    //     // Dimensões A4 em polegadas
    //     $larguraFolhaInch = $orientacao === 'retrato' ? 8.27 : 11.69;
    //     $alturaFolhaInch  = $orientacao === 'retrato' ? 11.69 : 8.27;

    //     // Calcula largura/altura de cada tile em pixels
    //     $larguraTile = intval($larguraImagem / $colunas);
    //     $alturaTile  = intval($alturaImagem / $linhas);

    //     // Calcula DPI baseado no tile e tamanho físico
    //     $dpi_largura = $larguraTile / $larguraFolhaInch;
    //     $dpi_altura  = $alturaTile / $alturaFolhaInch;
    //     $dpi_final   = min($dpi_largura, $dpi_altura);

    //     // Permite que o usuário ainda escolha DPI base, mas nunca diminui do calculado
    //     $dpi_solicitado = max((int)$request->input('dpi', 150), $dpi_final);

    //     // Aplica resolução no Imagick
    //     $imagick->setImageResolution($dpi_solicitado, $dpi_solicitado);
    //     $imagick->resampleImage($dpi_solicitado, $dpi_solicitado, \Imagick::FILTER_LANCZOS, 1);

    //     // Define tamanho do canvas de cada tile
    //     $larguraAlvo = intval($larguraImagem / $colunas);
    //     $alturaAlvo  = intval($alturaImagem / $linhas);

    //     $partes = [];

    //     for ($y = 0; $y < $linhas; $y++) {
    //         for ($x = 0; $x < $colunas; $x++) {
    //             $recorte = clone $imagick;
    //             $recorte->cropImage($larguraAlvo, $alturaAlvo, $x * $larguraAlvo, $y * $alturaAlvo);

    //             $canvas = new \Imagick();
    //             $canvas->newImage($larguraAlvo, $alturaAlvo, new \ImagickPixel("white"));
    //             $canvas->setImageFormat("png");

    //             if ($aspecto) {
    //                 // Mantém proporção dentro do tile
    //                 $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, true);
    //                 $xOffset = intval(($larguraAlvo - $recorte->getImageWidth()) / 2);
    //                 $yOffset = intval(($alturaAlvo - $recorte->getImageHeight()) / 2);
    //                 $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, $xOffset, $yOffset);
    //             } else {
    //                 // Estica para preencher o canvas inteiro
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
    //         'dpi_final' => round($dpi_solicitado, 2),
    //     ]);
    // }




    public function atividades()
    {
        return Inertia::render('PdfAtividades');
    }
}
