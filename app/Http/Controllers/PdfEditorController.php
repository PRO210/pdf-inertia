<?php

namespace App\Http\Controllers;

use App\Services\PdfEditorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Smalot\PdfParser\Parser;
use TCPDF_FONTS;

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
        // Limpa qualquer buffer de saída anterior que possa estar sujando os bytes
        if (ob_get_length()) {
            ob_end_clean();
        }

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
            $layoutPaginas = $request->input('layout_paginas', '1'); // Pega a nova variável que você enviará pelo FormData do front-end


            // 2. Chama a Service passando o arquivo temporário e as configurações decodificadas
            $pdfBinario = $this->pdfService->processarPdf(
                $caminhoTemporario,
                $pagesConfig,
                $textosCabecalho,
                $cabecalhoLayout,
                $cabecalhoTipo,
                $cabecalhoImagem,
                $bordaTipo,
                $layoutPaginas
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

    //


    public function processarPdfParaFabric(Request $request)
    {
        $userId = Auth::check() ? Auth::id() : 0;

        try {
            // Recebe o PDF ou imagem da página em Base64 do frontend
            $base64File = $request->input('file'); // data:image/jpeg;base64,... ou data:application/pdf;base64,...

            if (empty($base64File)) {
                return response()->json(['error' => 'Arquivo Base64 não fornecido.'], 400);
            }

            // ID do modelo gpt-4o-mini no Replicate (exemplo baseado na organização lucataco ou similar)
            // Certifique-se de usar o version ID correto do modelo que você escolheu no Replicate
            $version_id = "lucataco/gpt-4o-mini:400785c4d0a927fa6d7d9b9a674de451e50529d2f2d91bb4c004d49a4f65345d";
            $endpoint = 'https://api.replicate.com/v1/predictions';

            // Prompt detalhado para o GPT-4o-Mini retornar o formato ideal para o Fabric.js
            $promptSystem = "Você é um assistente especialista em OCR e conversão de layouts. " .
                "Analise a página enviada e extraia todos os elementos textuais e blocos importantes. " .
                "Retorne ESTRITAMENTE um array JSON contendo objetos formatados para o Fabric.js. " .
                "Não use markdown (como ```json) na resposta, retorne apenas o texto puro do JSON. " .
                "Formato esperado de cada objeto no array: " .
                "{ \"type\": \"textbox\", \"text\": \"texto extraído\", \"left\": 100, \"top\": 150, \"width\": 200, \"fontSize\": 14, \"fill\": \"#000000\" }";

            $payload = [
                'version' => $version_id,
                'input' => [
                    'custom_image' => $base64File, // Verifique o nome do parâmetro de entrada do modelo específico no Replicate
                    'prompt' => "Extraia os elementos desta página conforme as instruções do sistema.",
                    'system_prompt' => $promptSystem,
                    'max_tokens' => 2048,
                    'temperature' => 0.2
                ],
            ];

            // Chamada à API Replicate
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('REPLICATE_API_TOKEN'),
                'Content-Type' => 'application/json',
            ])
                ->timeout(60) // GPT pode demorar um pouco mais para processar e responder
                ->connectTimeout(30)
                ->post($endpoint, $payload);

            if (!$response->successful()) {
                Log::error('❌ Erro ao chamar Replicate (GPT-4o-Mini)', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return response()->json([
                    'error' => 'Falha ao chamar o modelo no Replicate',
                    'replicate_response' => $response->json(),
                ], $response->status());
            }

            $result = $response->json();

            // Retorna o ID da predição para o frontend fazer o polling (ou os dados caso use Prefer: wait)
            return response()->json([
                'success' => true,
                'prediction_id' => $result['id'] ?? null,
                'status' => $result['status'] ?? null,
                'output' => $result['output'] ?? null // Se o status for 'succeeded' instantaneamente
            ]);
        } catch (\Exception $e) {
            Log::error('💥 Erro inesperado no processarPdfParaFabric()', [
                'mensagem' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Erro interno do servidor: ' . $e->getMessage()], 500);
        }
    }



    public function analisar(Request $request)
    {
        $request->validate([
            'pdf' => 'required|file|mimes:pdf',
        ]);

        $parser = new Parser();
        $pdf = $parser->parseFile($request->file('pdf')->getRealPath());

        $resultado = [];

        foreach ($pdf->getPages() as $numeroPagina => $page) {

            $fontes = [];

            foreach ($page->getFonts() as $font) {

                $original = $font->getName();

                // Remove prefixo ABCDEF+
                $limpa = preg_replace('/^[A-Z]{6}\+/', '', $original);

                $nome = strtolower($limpa);

                // Fonte que será usada pelo TCPDF
                if (str_contains($nome, 'carlito') || str_contains($nome, 'calibri')) {
                    $family = 'carlito';
                } elseif (str_contains($nome, 'arial') || str_contains($nome, 'helvetica')) {
                    $family = 'helvetica';
                } elseif (str_contains($nome, 'times')) {
                    $family = 'times';
                } elseif (str_contains($nome, 'courier')) {
                    $family = 'courier';
                } else {
                    $family = 'helvetica';
                }

                // Estilo do TCPDF
                $style = '';

                if (str_contains($nome, 'bolditalic')) {
                    $style = 'BI';
                } elseif (str_contains($nome, 'bold')) {
                    $style = 'B';
                } elseif (
                    str_contains($nome, 'italic') ||
                    str_contains($nome, 'oblique')
                ) {
                    $style = 'I';
                }

                $fontes[$original] = [
                    'original' => $original,
                    'limpa'    => $limpa,
                    'family'   => $family,
                    'style'    => $style,
                ];
            }

            $resultado[] = [
                'page' => $numeroPagina + 1,
                'fonts' => array_values($fontes),
            ];
        }

        return response()->json($resultado);
    }
}
