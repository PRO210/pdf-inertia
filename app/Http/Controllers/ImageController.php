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
            ])
                ->timeout(60) // ⏳ Espera até 60 segundos (1 minuto) pela resposta
                ->connectTimeout(30) // Tempo máximo para conseguir a conexão inicial
                ->post('https://api.replicate.com/v1/models/recraft-ai/recraft-remove-background/predictions', [
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
                // 'Prefer' => 'wait', // Espera pela resposta síncrona
            ])
                ->timeout(60) // ⏳ Espera até 60 segundos (1 minuto) pela resposta
                ->connectTimeout(30) // Tempo máximo para conseguir a conexão inicial
                ->post($endpoint, $payload);

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
            // $outputValue = $result['output'] ?? null;

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

            // 6️⃣ Retorna JSON com o resultado starting)
            return response()->json([
                'success' => true,
                'replicate_id' => $result['id'] ?? null,
                'status' => $result['status'] ?? null
            ]);


            // 6️⃣ Retorna JSON com o resultado (o Base64 upscalado)
            // return response()->json([
            //     'success' => true,
            //     'output_base64_or_url' => $outputValue,
            //     'replicate_id' => $result['id'] ?? null
            // ]);
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

    /**
     * Processa a imagem para upscale (aumento de qualidade) usando Base64.
     * O frontend (JavaScript) agora faz o downsize para o limite de 2.1MP.
     */
    public function melhoramento(Request $request)
    {
        // Log::info('Entrei no melhoramente');
        // ⚠️ 1. OBTENÇÃO DOS DADOS (Pode ficar fora se for totalmente seguro)
        $userId = Auth::check() ? Auth::id() : 0;

        try {
            // 1️⃣ Verifica se a string Base64 da imagem está no corpo do JSON
            $base64Image = $request->input('image');
            if (empty($base64Image)) {
                Log::error('❌ String Base64 da imagem não encontrada na requisição.');
                // Retorno de erro DENTRO do try, mas o catch não o pega.
                return response()->json(['error' => 'Base64 da imagem não enviado'], 400);
            }

            // NOVO: ID da versão do megvii-research/nafnet
            $version_id = "sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2";
            $endpoint = 'https://api.replicate.com/v1/predictions';

            // 3️⃣ Monta payload         
            $payload = [
                'version' => $version_id,
                'input' => [
                    // ✅ Coloque TODOS os parâmetros do modelo AQUI dentro!
                    'image' => $base64Image,
                    'upscale' => 2,
                    'face_upsample' => true,
                    'background_enhance' => true,
                    'codeformer_fidelity' => 0,98,
                ],
            ];

            // 4️⃣ Chama a API Replicate com "Prefer: wait" (Ponto crítico de falha)
            // Se a rede falhar ou a API do Laravel lançar uma exceção, o catch pega.
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('REPLICATE_API_TOKEN'),
                'Content-Type' => 'application/json',
                // 'Prefer' => 'wait',
            ])
                ->timeout(30) // ⏳ Espera até 30 segundos (1 minuto) pela resposta
                ->connectTimeout(30) // Tempo máximo para conseguir a conexão inicial
                ->post($endpoint, $payload);

            // 5️⃣ Verifica resposta (Lógica de erro do Replicate)
            if (!$response->successful()) {
                Log::error('❌ Erro ao chamar Replicate', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    // ... (outros detalhes)
                ]);

                return response()->json([
                    'error' => 'Falha ao chamar Replicate',
                    'replicate_response' => $response->json(),
                ], $response->status());
            }

            $result = $response->json();
            $outputValue = $result['output'] ?? null;


            // 6️⃣ Retorna JSON com o resultado
            return response()->json([
                'success' => true,
                'replicate_id' => $result['id'] ?? null,
                'status' => $result['status'] ?? null
            ]);
       
        } catch (\Exception $e) {
            // 🚨 Bloco de captura para erros INESPERADOS (rede, configuração, etc.)
            Log::error('💥 Erro inesperado no melhoramento()', [
                'mensagem' => $e->getMessage(),
                'linha' => $e->getLine(),
                'arquivo' => $e->getFile(),
            ]);

            return response()->json(['error' => 'Erro interno do servidor: ' . $e->getMessage()], 500);
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

    public function removeObject()
    {
        return Inertia::render('RemoveObject/index');
    }


    public function briaEraser(Request $request)
    {
        $userId = Auth::check() ? Auth::id() : 0;
        $token = env('REPLICATE_API_TOKEN');

        // 1. VALIDAÇÃO (Agora precisamos de image E mask)
        if (!$request->hasFile('image') || !$request->hasFile('mask')) {
            return response()->json([
                'success' => false,
                'message' => 'Você precisa enviar a imagem original e a máscara (mask).',
            ], 400);
        }

        try {
            // 2. CONVERSÃO PARA BASE64
            $imageFile = $request->file('image');
            $maskFile = $request->file('mask');

            $base64Image = 'data:image/' . $imageFile->getClientOriginalExtension() . ';base64,' . base64_encode(file_get_contents($imageFile->getRealPath()));
            $base64Mask = 'data:image/' . $maskFile->getClientOriginalExtension() . ';base64,' . base64_encode(file_get_contents($maskFile->getRealPath()));

            // 3. ENVIO PARA O ENDPOINT DO BRIA ERASER
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$token}",
                'Content-Type' => 'application/json',
                'Prefer' => 'wait',
            ])->post('https://api.replicate.com/v1/models/bria/eraser/predictions', [
                'input' => [
                    'image' => $base64Image,
                    'mask' => $base64Mask,
                ],
            ]);

            $data = $response->json();

            // 4. TRATAMENTO DE ERROS
            if ($response->failed()) {
                Log::error('❌ Erro ao chamar Bria Eraser', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Erro na API do Replicate: ' . ($data['detail'] ?? 'Falha desconhecida.'),
                ], $response->status());
            }

            $outputValue = $data['output'] ?? null;

            if ($outputValue) {
                return response()->json([
                    'success' => true,
                    'output_base64_or_url' => $outputValue,
                    'replicate_id' => $data['id'] ?? null,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'O Replicate não retornou o resultado esperado.',
            ], 500);
        } catch (\Exception $e) {
            Log::error('💥 Erro inesperado no briaEraser()', ['mensagem' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Erro interno: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function twn39Lama(Request $request)
    {
        $userId = Auth::check() ? Auth::id() : 0;
        $token = env('REPLICATE_API_TOKEN');

        // 1. Validação
        if (!$request->hasFile('image') || !$request->hasFile('mask')) {
            return response()->json([
                'success' => false,
                'message' => 'Você precisa enviar a imagem original e a máscara (mask).',
            ], 400);
        }

        try {

            // 2. Converter para Base64 (Data URL)
            $imageFile = $request->file('image');
            $maskFile  = $request->file('mask');

            $imageBase64 = 'data:' . $imageFile->getMimeType() . ';base64,' .
                base64_encode(file_get_contents($imageFile->getRealPath()));

            $maskBase64 = 'data:' . $maskFile->getMimeType() . ';base64,' .
                base64_encode(file_get_contents($maskFile->getRealPath()));

            // 3. Chamada Replicate
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$token}",
                'Content-Type' => 'application/json',
                'Prefer' => 'wait',

            ])->timeout(120) // Aguarda até 2 minutos
                ->connectTimeout(30) // Aguarda até 30s para estabelecer a conexão inicial
                ->post('https://api.replicate.com/v1/predictions', [
                    'version' => '2b91ca2340801c2a5be745612356fac36a17f698354a07f48a62d564d3b3a7a0', // twn39/lama
                    'input' => [
                        'image' => $imageBase64,
                        'mask'  => $maskBase64,
                    ],
                ]);

            $data = $response->json();

            // 4. TRATAMENTO DE ERROS
            if ($response->failed()) {
                Log::error('❌ Erro ao chamar Twn39/Lama Eraser', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Erro na API do Replicate: ' . ($data['detail'] ?? 'Falha desconhecida.'),
                ], $response->status());
            }


            $outputValue = $data['output'] ?? null;

            if ($outputValue) {
                return response()->json([
                    'success' => true,
                    'output_base64_or_url' => $outputValue,
                    'replicate_id' => $data['id'] ?? null,
                ]);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }


    public function replicateStatus(string $id)
    {
        try {

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('REPLICATE_API_TOKEN'),
            ])->get("https://api.replicate.com/v1/predictions/{$id}");

            if (!$response->successful()) {

                return response()->json([
                    'success' => false
                ], 500);
            }

            $result = $response->json();

            return response()->json([
                'success' => true,
                'status' => $result['status'] ?? null,
                'output' => $result['output'] ?? null,
            ]);
        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
