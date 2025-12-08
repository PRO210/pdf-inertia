<?php

namespace App\Http\Controllers;

use App\Actions\CleanUserUpscaleFiles;
use App\Actions\SaveImageFromSource;
use App\Helpers\ImageToMask;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Imagick;
use Inertia\Inertia;

class ImageController extends Controller
{

    public function index()
    {
        return Inertia::render('TratamentoImagens/Index');
    }

    // ...
    // 🔹 1. Remover fundo da imagem
    public function removeBackground(Request $request)
    {
        // ⚠️ 1. OBTENÇÃO DOS DADOS NECESSÁRIOS PARA O NOME DO ARQUIVO      
        $userId = Auth::check() ? Auth::id() : 0;

        // 1.1 OBTÉM E VALIDA O ARQUIVO DE IMAGEM
        if (!$request->hasFile('image') || !$request->file('image')->isValid()) {
            return response()->json([
                'success' => false,
                'message' => 'Nenhuma imagem válida foi enviada.',
            ], 400);
        }

        $imageFile = $request->file('image');

        // 2. CONVERTE O ARQUIVO PARA BASE64
        $imageData = file_get_contents($imageFile->getRealPath());
        $base64Image = 'data:image/' . $imageFile->getClientOriginalExtension() . ';base64,' . base64_encode($imageData);

        $token = env('REPLICATE_API_TOKEN');

        try {

            // 3. ENVIA A REQUISIÇÃO PARA O REPLICATE COM BASE64
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$token}",
                'Content-Type' => 'application/json',
                'Prefer' => 'wait',
            ])->post('https://api.replicate.com/v1/models/recraft-ai/recraft-remove-background/predictions', [
                'input' => [
                    'image' => $base64Image,
                ],
            ]);

            $data = $response->json();

            // 5. Verifica erros de requisição da API (status code)
            if ($response->failed()) {
                Log::error('❌ Erro ao chamar Replicate (RemoveBG)', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Erro na API do Replicate: ' . ($data['detail'] ?? 'Falha desconhecida.'),
                    'data' => $data,
                ], $response->status());
            }

            // Pega a saída (URL ou Base64 Data URL)
            $outputValue = $data['output'] ?? null;

            if ($outputValue) {

                return response()->json([
                    'success' => true,
                    'output_base64_or_url' => $outputValue,
                    'replicate_id' => $data['id'] ?? null,
                    // 'saved_image_url' => $imageUrl, // Adiciona a URL pública para o frontend
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'O Replicate não retornou uma URL de imagem.',
                'data' => $data,
            ], 500);
        } catch (\Exception $e) {
            Log::error('💥 Erro inesperado no removeBackground()', ['mensagem' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Exceção ao processar a requisição: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Processa a imagem para upscale (aumento de qualidade) usando Base64.
     * O frontend (JavaScript) agora faz o downsize para o limite de 2.1MP.
     */
    public function upscale(Request $request, SaveImageFromSource $saveImage, CleanUserUpscaleFiles $cleanFiles)
    {
        // ⚠️ 1. OBTENÇÃO DOS DADOS NECESSÁRIOS PARA O NOME DO ARQUIVO      
        $userId = Auth::check() ? Auth::id() : 0;

        try {
            // 1️⃣ Verifica se a string Base64 da imagem está no corpo do JSON
            $base64Image = $request->input('image');
            if (empty($base64Image)) {
                Log::error('❌ String Base64 da imagem não encontrada na requisição.');
                return response()->json(['error' => 'Base64 da imagem não enviado'], 400);
            }

            // // --- 1. IMAGEM ORIGINAL (INPUT) ---
            // $originalSuffix = '_upscale_original';

            // // 🧹 LIMPEZA: Remove a versão antiga da imagem original deste usuário.
            // $cleanFiles(
            //     $userId,
            //     $originalSuffix
            // );

            // // ---------------------------------------------
            // // 1. 💾 SALVAR A IMAGEM ORIGINAL (Chamada à Action)
            // $originalFileName = $saveImage(
            //     $base64Image,
            //     $userId,
            //     $originalSuffix
            // );


            // if ($originalFileName) {
            //     Log::info('✅ Imagem original salva via Action.', ['filename' => $originalFileName]);
            // }

            // 2️⃣ Fator de escala (default = 2), limitado a 4×
            $scale = min((int) $request->input('scale', 2), 4);

            // O Base64 recebido já está no formato ideal.

            // 3️⃣ Monta payload
            $payload = [
                'input' => [
                    'image' => $base64Image,
                    'scale' => $scale
                ]
            ];

            // 4️⃣ Chama a API Replicate com "Prefer: wait"
            $endpoint = 'https://api.replicate.com/v1/models/recraft-ai/recraft-crisp-upscale/predictions';

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('REPLICATE_API_TOKEN'),
                'Content-Type' => 'application/json',
                'Prefer' => 'wait', // Espera pela resposta síncrona
            ])->post($endpoint, $payload);

            // 5️⃣ Verifica resposta
            if (!$response->successful()) {
                // ... (Lógica de erro do Replicate) ...
                // Se falhar aqui, a imagem de retorno NÃO será salva.
                Log::error('❌ Erro ao chamar Replicate', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'payload_sample' => array_merge($payload['input'], ['image' => '...base64_data_omitted...']),
                ]);

                return response()->json([
                    'error' => 'Falha ao chamar Replicate',
                    'replicate_response' => $response->json(),
                ], $response->status());
            }

            $result = $response->json();
            $outputValue = $result['output'] ?? null;

            // // --- 2. IMAGEM DE RETORNO (OUTPUT) ---
            // $returnSuffix = '_upscale_return';

            // if (!empty($outputValue)) {
            //     // 🧹 LIMPEZA: Remove a versão antiga da imagem de retorno deste usuário.
            //     $cleanFiles(
            //         $userId,
            //         $returnSuffix
            //     );
            // }

            // // 2. SALVAR A IMAGEM DE RETORNO (Chamada à Action)
            // if (!empty($outputValue)) {
            //     $savedFileName = $saveImage(
            //         $outputValue,
            //         $userId,
            //         $returnSuffix
            //     );

            //     if ($savedFileName) {

            //         Log::info('✅ Imagem upscalada salva via Action.', ['filename' => $savedFileName]);
            //     } else {
            //         Log::warning('⚠️ Imagem upscalada não foi salva. Output não era Base64/URL ou falha no download.');
            //     }
            // }


            // 6️⃣ Retorna JSON com o resultado (o Base64 upscalado)
            return response()->json([
                'success' => true,
                'output_base64_or_url' => $outputValue,
                'replicate_id' => $result['id'] ?? null
            ]);
        } catch (\Exception $e) {
            // ... (Lógica de tratamento de exceção) ...
            Log::error('💥 Erro inesperado no upscale()', [
                'mensagem' => $e->getMessage(),
                'linha' => $e->getLine(),
                'arquivo' => $e->getFile(),
            ]);

            return response()->json(['error' => 'Erro interno: ' . $e->getMessage()], 500);
        }
    }

    public function saveFinalImage(Request $request, SaveImageFromSource $saveImage, CleanUserUpscaleFiles $cleanFiles)
    {
        $userId = Auth::check() ? Auth::id() : 0;
        $base64Image = $request->input('image');
        $type = $request->input('type'); // Deve ser 'upscale_final_corrected' ou similar

        if (empty($base64Image) || $userId === 0) {
            return response()->json(['success' => false, 'message' => 'Dados ou autenticação ausentes.'], 400);
        }

        try {
            // Define o sufixo baseado no tipo
            $suffix = '_upscale_return_final';
            // 🧹 Opcional: Limpar a versão anterior (RAW IA) antes de salvar a corrigida
            // Depende se você quer manter o RAW ou não. Se não, limpe aqui.
            // $cleanFiles($userId, $suffix); // Pode ser necessário um sufixo diferente se for limpar o RAW IA.

            // 💾 SALVA A IMAGEM FINAL CORRIGIDA
            $savedFileName = $saveImage(
                $base64Image,
                $userId,
                $suffix
            );

            if ($savedFileName) {
                $imageUrl = Storage::url('temp/' . $savedFileName);

                // 2. 🔍 BUSCA A URL DA IMAGEM ORIGINAL (INPUT)
                // Assumimos que a imagem original foi salva com o sufixo '_upscale_original'.
                $originalPattern = storage_path('app/public/temp/') . $userId . '_upscale_original.*';
                $originalFiles = glob($originalPattern);

                if (!empty($originalFiles)) {
                    $originalInputUrl = Storage::url($originalFiles[0]);
                }

                Log::info('✅ Imagem final corrigida (Pica.js) salva.', ['filename' => $savedFileName]);

                return response()->json([
                    'success' => true,
                    'saved_image_url' => $imageUrl, // Retorna a URL pública
                    'original_image_url' => $originalInputUrl, // URL da imagem original (input)
                ]);
            }

            return response()->json(['success' => false, 'message' => 'Falha ao salvar a imagem no disco.'], 500);
        } catch (\Exception $e) {
            Log::error('💥 Erro ao salvar imagem final corrigida: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Erro interno ao salvar.'], 500);
        }
    }

    /**
     * Verifica a existência das imagens temporárias (original e retorno) para o usuário logado.
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTemporaryImages(Request $request)
    {
        // Obtém o ID do usuário logado
        $userId = Auth::check() ? Auth::id() : 0;

        if ($userId === 0) {
            return response()->json(['error' => 'Usuário não autenticado.'], 401);
        }

        // 💡 A operação (upscale, removebg, imagetoanime) vem do query parameter '?operation=...'
        $operation = $request->query('operation');

        $diskPath = 'temp/';

        // Define os sufixos com base na operação
        switch ($operation) {
            case 'upscale':
                $originalSuffix = '_upscale_original';
                $returnSuffix = '_upscale_return'; // Ou _upscale_result
                break;
            case 'removebg':
                $originalSuffix = '_removebg_original';
                $returnSuffix = '_removebg_return';
                break;
            case 'imagetoanime':
                $originalSuffix = '_anime_original';
                $returnSuffix = '_anime_return';
                break;
            default:
                return response()->json(['error' => 'Operação inválida.'], 400);
        }
        $diskPath = 'temp/';

        // 1. Busca por ARQUIVOS ORIGINAIS (Ex: 1_upscale_original.webp)
        $originalPattern = storage_path('app/public/' . $diskPath) . $userId . $originalSuffix . '.*';
        $originalFiles = glob($originalPattern);
        $originalUrl = null;

        if (!empty($originalFiles)) {
            // Pega o primeiro (e único) arquivo encontrado e gera a URL pública
            $originalUrl = Storage::url(str_replace(storage_path('app/public/'), '', $originalFiles[0]));
        }

        // 2. Busca por ARQUIVOS DE RETORNO (Ex: 1_upscale_return.webp)
        $returnPattern = storage_path('app/public/' . $diskPath) . $userId . $returnSuffix . '.*';
        $returnFiles = glob($returnPattern);
        $returnUrl = null;

        if (!empty($returnFiles)) {
            // Pega o primeiro (e único) arquivo encontrado e gera a URL pública
            $returnUrl = Storage::url(str_replace(storage_path('app/public/'), '', $returnFiles[0]));
        }

        return response()->json([
            'success' => true,
            'original_image_url' => $originalUrl,
            'result_image_url' => $returnUrl,
        ]);
    }


    public function createImageToAnime()
    {
        return Inertia::render('ImagemToAnime/index');
    }

    public function imageToAnime(Request $request)
    {
        try {
            // 1️⃣ Verifica se a string Base64 da imagem está no corpo do JSON
            $base64Image = $request->input('image');
            if (empty($base64Image)) {
                Log::error('❌ String Base64 da imagem não encontrada na requisição.');
                return response()->json(['error' => 'Base64 da imagem não enviado'], 400);
            }

            // 2️⃣ Fator de escala (default = 2), limitado a 4×          

            // O Base64 recebido já está no formato ideal.

            // 3️⃣ Monta payload
            // Use termos em inglês para melhor controle do modelo.

            $promptComOlhos = '**brown eyes, ignore reflections on glasses, maintain original eye color**';

            // 3️⃣ Monta payload
            $payload = [
                'input' => [
                    'image' => $base64Image,
                    'prompt' => 'transform into anime, face fidelity, accurate likeness, clean line art,
                     soft colors, natural skin tone, subtle shading, no red color on face, 
                     **brown eyes, ignore reflections on glasses, maintain original eye color**',
                ]
            ];

            // 4️⃣ Chama a API Replicate com "Prefer: wait"
            $endpoint = 'https://api.replicate.com/v1/models/qwen-edit-apps/qwen-image-edit-plus-lora-photo-to-anime/predictions';

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('REPLICATE_API_TOKEN'),
                'Content-Type' => 'application/json',
                'Prefer' => 'wait', // Espera pela resposta síncrona
            ])->post($endpoint, $payload);

            // 5️⃣ Verifica resposta
            if (!$response->successful()) {
                Log::error('❌ Erro ao chamar Replicate', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    // Não logar Base64 inteiro
                    'payload_sample' => array_merge($payload['input'], ['image' => '...base64_data_omitted...']),
                ]);

                return response()->json([
                    'error' => 'Falha ao chamar Replicate',
                    'replicate_response' => $response->json(),
                ], $response->status());
            }

            $result = $response->json();

            // O output será o Base64 Data URL da imagem upscalada
            $outputValue = $result['output'] ?? null;

            Log::info('✅ Upscale concluído (Base64).', [
                'status' => $result['status'] ?? 'unknown',
                'output_type' => is_string($outputValue) ? (substr($outputValue, 0, 5) == 'data:' ? 'Base64' : 'URL') : 'null',
            ]);

            // 6️⃣ Retorna JSON com o resultado (o Base64 upscalado)
            return response()->json([
                'success' => true,
                'output_base64_or_url' => $outputValue,
                'replicate_id' => $result['id'] ?? null,
            ]);
        } catch (\Exception $e) {
            Log::error('💥 Erro inesperado no upscale()', [
                'mensagem' => $e->getMessage(),
                'linha' => $e->getLine(),
                'arquivo' => $e->getFile(),
            ]);

            return response()->json(['error' => 'Erro interno: ' . $e->getMessage()], 500);
        }
    }

    public function imageInMask(Request $request)
    {
        $request->validate([
            'imagens.*' => 'required|image',
            'colunas' => 'required|integer',
            'linhas'  => 'required|integer',
            'mascara' => 'required|string'
        ]);

        $pdfPath = ImageToMask::gerarPdf(
            $request->file('imagens'),
            [
                'orientacao' => $request->orientacao ?? 'paisagem',
                'colunas'    => $request->colunas ?? 2,
                'linhas'     => $request->linhas ?? 2,
                'margem_cm'  => $request->margem_cm ?? 0.5,
            ]
        );

        $maskPath = public_path('imagens/mascaras/coracao.png');
        $imagePath = public_path('imagens/mascaras/Gil.jpg');

        $image = new Imagick($imagePath);
        $imageW = $image->getImageWidth();
        $imageH = $image->getImageHeight();

        Log::info("Imagem original: {$imageW}x{$imageH}");

        // ✅ MÉTODO CORRETO PARA ImageMagick 6.9.10
        $mask = new Imagick($maskPath);
        $mask->resizeImage($imageW, $imageH, Imagick::FILTER_LANCZOS, 1);

        // 🔧 ImageMagick 6.x: Converte GRAY -> ALPHA manualmente
        $mask->setImageColorspace(Imagick::COLORSPACE_GRAY);
        $mask->setImageMatte(true);  // Ativa canal alpha
        $mask->evaluateImage(Imagick::EVALUATE_MULTIPLY, 1, Imagick::CHANNEL_ALPHA); // Luminância -> Alpha

        // Salva máscara DEBUG
        $mask->writeImage(storage_path('app/temp_pdf/debug_mask.png'));

        // 🔧 COMPOSITE CORRETO para IM 6.x (sua máscara branca=visível)
        $image->compositeImage($mask, Imagick::COMPOSITE_DSTIN, 0, 0);
        Log::info("Máscara aplicada com COMPOSITE_DSTIN (IM 6.9)");

        // Salva resultado DEBUG
        $image->writeImage(storage_path('app/temp_pdf/debug_result.png'));

        // Fundo branco para visualizar
        $background = new Imagick();
        $background->newImage($imageW, $imageH, 'white');
        $background->setImageFormat('png');
        $background->compositeImage($image, Imagick::COMPOSITE_OVER, 0, 0);

        $outputPath = storage_path('app/temp_pdf/masked_' . uniqid() . '.png');
        $background->writeImage($outputPath);

        $image->clear();
        $mask->clear();
        $background->clear();

        Log::info("Resultado salvo em: {$outputPath}");

        return response()->file($outputPath);
    }
}
