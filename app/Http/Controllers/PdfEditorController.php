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
}
