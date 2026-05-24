<?php

namespace App\Http\Controllers;

use App\Services\PdfEditorService;
use Illuminate\Http\Request;
use Inertia\Inertia;
// use Intervention\Image\ImageManager;
// use Intervention\Image\Drivers\Gd\Driver;



class PdfEditorController extends Controller
{
    protected $pdfService;

    // Injeta a Service automaticamente através do Service Container do Laravel
    public function __construct(PdfEditorService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

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
    //     $alturaFolhaIn  = $orientacao !== 'retrato' ? 11.69 : 8.27;

    //     $tamanhosDebug[] = ['larguraFolhaIn' => $larguraFolhaIn];
    //     $tamanhosDebug[] = ['alturaFolhaIn' => $alturaFolhaIn];

    //     // Dimensões reais da imagem
    //     $imgWidthPx  = $imagick->getImageWidth();
    //     $imgHeightPx = $imagick->getImageHeight();

    //     $tamanhosDebug[] = ['imgWidthPx' => $imgWidthPx];
    //     $tamanhosDebug[] = ['imgHeightPx' => $imgHeightPx];

    //     // 🔹 Calcula DPI real em cada eixo
    //     $dpiX = $imgWidthPx / ($larguraFolhaIn * $colunas);
    //     $dpiY = $imgHeightPx / ($alturaFolhaIn * $linhas);
    //     $dpi  = (int) round(min($dpiX, $dpiY));

    //     // // 🔹 Limite superior adaptativo conforme tamanho do pôster
    //     // $maxDpi = match (true) {
    //     //     $colunas <= 2 => 144,  // pôster pequeno
    //     //     $colunas <= 3 => 100,  // pequeno
    //     //     $colunas <= 4 => 100,  // médio
    //     //     $colunas <= 5 => 100,  // médio
    //     //     $colunas <= 6 => 100,   // grande
    //     //     $colunas <= 8 => 100,  // grande
    //     //     default       => 82,  // gigante (até 10x10)
    //     // };

    //     // 🔹 DPI mínimo adaptativo (evita pixelização em imagens pequenas)
    //     $minDpi = match (true) {
    //         $colunas <= 2 => 72,   // pôster pequeno, imagem pequena precisa de mais nitidez
    //         $colunas <= 4 => 60,   // médio
    //         $colunas <= 6 => 50,   // grande
    //         default       => 40,   // muito grande, não precisa forçar DPI
    //     };

    //     // 🔹 Define limite de DPI de forma proporcional conforme o tamanho (colunas/folhas)
    //     // $minDpi = 72;   // limite inferior (outdoors, 100 folhas)
    //     $maxDpi = 150;  // limite superior (pequeno, A4–A3)
    //     $maxColunas = 100; // limite máximo considerado

    //     // Calcula o DPI de forma inversamente proporcional ao número de colunas
    //     $maxDpi = max(
    //         $minDpi,
    //         round($maxDpi - (($colunas - 1) / ($maxColunas - 1)) * ($maxDpi - $minDpi))
    //     );

    //     // 🔹 Aplica o DPI final dentro dos limites
    //     $dpi = max($minDpi, min($dpi, $maxDpi));

    //     // 🔹 Margem em cm
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

    //     // 🔹 Debug opcional
    //     $tamanhosDebug[] = [
    //         'dpiX' => round($dpiX, 2),
    //         'dpiY' => round($dpiY, 2),
    //         'dpiFinal' => $dpi,
    //         'minDpi' => $minDpi,
    //         'maxDpi' => $maxDpi,
    //     ];

    //     // $tamanhosDebug[] = ['larguraAlvo(px)' => $larguraAlvo];
    //     // $tamanhosDebug[] = ['alturaAlvo(px)' => $alturaAlvo];

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
    //             $canvas->setImageCompressionQuality(85);
    //             $canvas->setImageUnits(\Imagick::RESOLUTION_PIXELSPERINCH);
    //             $canvas->setImageResolution($dpi, $dpi);

    //             // Centraliza se aspecto
    //             // $xOffset = (int) floor(($larguraAlvo - $recorte->getImageWidth()) / 2);
    //             // $yOffset = (int) floor(($alturaAlvo - $recorte->getImageHeight()) / 2);
    //             $xOffset = 0;
    //             $yOffset = 0;
    //             $canvas->compositeImage($recorte, \Imagick::COMPOSITE_OVER, $xOffset, $yOffset);

    //             $partes[] = 'data:image/jpeg;base64,' . base64_encode($canvas->getImageBlob());

    //             // Obtém as dimensões em pixels do recorte após o redimensionamento
    //             // $larguraConteudoPx = $recorte->getImageWidth();
    //             // $alturaConteudoPx = $recorte->getImageHeight();

    //             // $tamanhosDebug[] = ['larguraConteudoPx' => $larguraConteudoPx];
    //             // $tamanhosDebug[] = ['alturaConteudoPx' => $alturaConteudoPx];

    //             // Converte essas dimensões para centímetros
    //             // $larguraConteudoCm = round($larguraConteudoPx / $dpi * 2.54, 2);
    //             // $alturaConteudoCm = round($alturaConteudoPx / $dpi * 2.54, 2);

    //             // $tamanhosDebug[] = ['larguraConteudoCm' => $larguraConteudoCm];
    //             // $tamanhosDebug[] = ['alturaConteudoCm' => $alturaConteudoCm];

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


    public function atividades()
    {
        return Inertia::render('PdfAtividades');
    }


    public function editorPdfCanvas()
    {
        return Inertia::render('EditorPdf/index');
    }


    public function gerarPdfCanvas(Request $request)
    {
        // 1. Valida o arquivo real e as strings estruturadas do FormData
        $request->validate([
            'pdf_file' => 'required|file|mimes:pdf|max:51200', // max 50MB
            'paginas' => 'required|string', // Chega como string JSON do FormData
            'textos_cabecalho' => 'nullable|string', // Chega como string JSON do FormData
        ]);

        try {
            // Obtém o arquivo da memória temporária do PHP (não salva permanentemente no storage)
            $file = $request->file('pdf_file');
            $caminhoTemporario = $file->getPathname();

            // Transforma as strings JSON enviadas pelo Front em arrays nativos do PHP
            $pagesConfig = json_decode($request->input('paginas'), true);
            $textosCabecalho = json_decode($request->input('textos_cabecalho', '[]'), true);

            if (!is_array($pagesConfig)) {
                return response()->json(['error' => 'Configurações de páginas inválidas.'], 422);
            }

            $cabecalhoLayout = $request->input('cabecalho_layout', 'sobreposto');
            $cabecalhoTipo = $request->input('cabecalho_tipo', 'texto');
            $cabecalhoImagem = $request->input('cabecalho_imagem'); // String Base64
            $bordaTipo = $request->input('borda_tipo', 'none'); // "lapis", "abelhas", "none", etc.

            // 2. Chama a Service passando o arquivo temporário e as configurações decodificadas
            $pdfBinario = $this->pdfService->processarPdf(
                $caminhoTemporario,
                $pagesConfig,
                $textosCabecalho,
                $cabecalhoLayout,
                $cabecalhoTipo,
                $cabecalhoImagem,
                $bordaTipo
            );

            // 3. Retorna o arquivo binário direto para download
            return response($pdfBinario, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="pdf_modificado.pdf"',
                'Cache-Control' => 'private, max-age=0, must-revalidate',
                'Pragma' => 'public',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao processar o PDF no backend: ' . $e->getMessage()
            ], 500);
        }
    }
}
