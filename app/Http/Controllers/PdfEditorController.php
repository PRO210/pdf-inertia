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
    //     $manager = new ImageManager(new Driver());

    //     $base64 = $request->input('imagem');
    //     $colunas = (int) $request->input('colunas', 2);
    //     $linhas = (int) $request->input('linhas', 2);
    //     $orientacao = $request->input('orientacao', 'retrato');

    //     // Decodifica e lê a imagem original apenas uma vez
    //     $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64));
    //     $imgOriginal = $manager->read($imageData);


    //     $larguraImagem = $imgOriginal->width();
    //     $alturaImagem = $imgOriginal->height();

    //     $larguraParte = intval($larguraImagem / $colunas);
    //     $alturaParte = intval($alturaImagem / $linhas);

    //     // Dimensões da folha A4 em pixels 300 DPI (retrato ou paisagem)
    //     $larguraFolha = $orientacao === 'retrato' ? 2480 : 3508;
    //     $alturaFolha = $orientacao === 'retrato' ? 3508 : 2480;

    //     // // Cada parte deve ocupar essa fração da folha
    //     // $larguraAlvo = intval($larguraFolha / $colunas);
    //     // $alturaAlvo = intval($alturaFolha / $linhas);

    //     // Alvo nunca maior que a parte original (evita perda de qualidade)
    //     $larguraAlvo = min(intval($larguraFolha / $colunas), $larguraParte);
    //     $alturaAlvo = min(intval($alturaFolha / $linhas), $alturaParte);

    //     $partes = [];

    //     for ($y = 0; $y < $linhas; $y++) {
    //         for ($x = 0; $x < $colunas; $x++) {
    //             // Clona a imagem original para evitar reler o base64
    //             $recorte = clone $imgOriginal;
    //             $recorte->crop($larguraParte, $alturaParte, $x * $larguraParte, $y * $alturaParte);

    //             // Redimensiona para caber na fração da folha, mantendo proporção
    //             $recorte->resize($larguraAlvo, $alturaAlvo, function ($constraint) {
    //                 $constraint->aspectRatio();
    //                 $constraint->upsize();
    //             });

    //             // Cria um canvas branco com o tamanho da fração da folha e centraliza o recorte
    //             $canvas = $manager->create($larguraAlvo, $alturaAlvo)->fill('ffffff');
    //             $canvas->place($recorte, 'center');

    //             // Converte para PNG com qualidade máxima
    //             $partes[] = 'data:image/png;base64,' . base64_encode($canvas->toPng());
    //         }
    //     }

    //     return response()->json(['partes' => $partes]);
    // }

    // public function cortarImagem(Request $request)
    // {
    //     $manager = new ImageManager(new Driver());

    //     $base64 = $request->input('imagem');
    //     $colunas = (int) $request->input('colunas', 2);
    //     $linhas = (int) $request->input('linhas', 2);
    //     $orientacao = $request->input('orientacao', 'retrato');

    //     // Decodifica e lê a imagem original uma vez
    //     $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64));
    //     $imgOriginal = $manager->read($imageData);

    //     // Dimensões da folha A4 em pixels 300 DPI (retrato ou paisagem)
    //     $larguraFolha = $orientacao === 'retrato' ? 2480 : 3508;
    //     $alturaFolha = $orientacao === 'retrato' ? 3508 : 2480;

    //     // Calcula o tamanho ideal da imagem original para o corte proporcional à folha
    //     $larguraIdeal = $colunas * intval($larguraFolha / $colunas);
    //     $alturaIdeal = $linhas * intval($alturaFolha / $linhas);

    //     // Redimensiona a imagem original mantendo proporção e evitando upsize exagerado
    //     $imgOriginal->resize($larguraIdeal, $alturaIdeal, function ($constraint) {
    //         $constraint->aspectRatio();
    //         $constraint->upsize();
    //     });

    //     // Agora obtém as dimensões da imagem redimensionada
    //     $larguraImagem = $imgOriginal->width();
    //     $alturaImagem = $imgOriginal->height();

    //     // Calcula o tamanho de cada parte para o corte
    //     $larguraParte = intval($larguraImagem / $colunas);
    //     $alturaParte = intval($alturaImagem / $linhas);

    //     // Tamanho que cada parte deverá ter para caber na folha (fração A4)
    //     $larguraAlvo = intval($larguraFolha / $colunas);
    //     $alturaAlvo = intval($alturaFolha / $linhas);

    //     $partes = [];

    //     for ($y = 0; $y < $linhas; $y++) {
    //         for ($x = 0; $x < $colunas; $x++) {
    //             // Corta a parte da imagem redimensionada
    //             $recorte = clone $imgOriginal;
    //             $recorte->crop($larguraParte, $alturaParte, $x * $larguraParte, $y * $alturaParte);

    //             // Cria um canvas branco com o tamanho alvo e centraliza o recorte
    //             $canvas = $manager->create($larguraAlvo, $alturaAlvo)->fill('ffffff');
    //             $canvas->place($recorte, 'center');

    //             // Converte para PNG com qualidade máxima
    //             $partes[] = 'data:image/png;base64,' . base64_encode($canvas->toPng());
    //         }
    //     }

    //     return response()->json(['partes' => $partes]);
    // }


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

        // Dimensões da folha A4 em 300 DPI
        $larguraFolha = $orientacao === 'retrato' ? 2480 : 3508;
        $alturaFolha = $orientacao === 'retrato' ? 3508 : 2480;

        // Tamanho ideal da imagem para o corte proporcional
        $larguraIdeal = $colunas * intval($larguraFolha / $colunas);
        $alturaIdeal = $linhas * intval($alturaFolha / $linhas);

        // Redimensiona com filtro Lanczos (ImageMagick 6.9 é compatível)
        // Redimensiona dependendo do aspecto
        if ($aspecto) {
            // Mantém proporção
            $imagick->resizeImage($larguraIdeal, $alturaIdeal, \Imagick::FILTER_LANCZOS, 1, true);
        } else {
            // Estica para caber exatamente na folha, ignorando proporção
            $imagick->resizeImage($larguraIdeal, $alturaIdeal, \Imagick::FILTER_LANCZOS, 1, false);
        }
        // $imagick->resizeImage($larguraIdeal, 0, \Imagick::FILTER_LANCZOS, 1);


        $imagick->sharpenImage(0.5, 0.3);

        // Pega dimensões após redimensionamento
        $larguraImagem = $imagick->getImageWidth();
        $alturaImagem = $imagick->getImageHeight();

        // Tamanhos dos recortes
        $larguraParte = intval($larguraImagem / $colunas);
        $alturaParte = intval($alturaImagem / $linhas);

        $larguraAlvo = intval($larguraFolha / $colunas);
        $alturaAlvo = intval($alturaFolha / $linhas);

        $partes = [];

        for ($y = 0; $y < $linhas; $y++) {
            for ($x = 0; $x < $colunas; $x++) {
                // Recorta a parte desejada
                $recorte = clone $imagick;
                $recorte->cropImage($larguraParte, $alturaParte, $x * $larguraParte, $y * $alturaParte);

                // Cria um canvas branco no tamanho alvo
                $canvas = new \Imagick();
                $canvas->newImage($larguraAlvo, $alturaAlvo, new \ImagickPixel("white"));
                $canvas->setImageFormat("png");

                // // Centraliza o recorte no canvas
                // $xOffset = intval(($larguraAlvo - $larguraParte) / 2);
                // $yOffset = intval(($alturaAlvo - $alturaParte) / 2);
                // $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, $xOffset, $yOffset);

                if ($aspecto) {
                    // Mantendo proporção                 
                    $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, 0, 0);
                } else {
                    // Estica cada recorte para ocupar o canvas inteiro
                    $recorte->resizeImage($larguraAlvo, $alturaAlvo, \Imagick::FILTER_LANCZOS, 1, false);
                    $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, 0, 0);
                }

                // Exporta como base64 PNG
                $partes[] = 'data:image/png;base64,' . base64_encode($canvas->getImageBlob());

                // Libera recursos do recorte após uso
                if ($recorte instanceof \Imagick) {
                    $recorte->clear();
                    $canvas->clear();
                }
            }
        }

        $imagick->clear();

        // $debug = [
        //     'aspecto'      => $aspecto,
        //     'larguraImagem' => $larguraImagem,
        //     'alturaImagem' => $alturaImagem,
        //     'larguraParte' => $larguraParte,
        //     'alturaParte' => $alturaParte,
        //     'larguraAlvo'  => $larguraAlvo,
        //     'alturaAlvo'   => $alturaAlvo,
        // ];
        // return response()->json(['partes' => $partes, 'debug'  => $debug]);

        return response()->json(['partes' => $partes]);
    }
}
