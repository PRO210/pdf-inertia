<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ImageController extends Controller
{

    public function index()
    {
        return Inertia::render('TratamentoImagens/Index');
    }


    // 🔹 1. Remover fundo da imagem
    public function removeBackground(Request $request)
    {
        // 1.1 OBTÉM E VALIDA O ARQUIVO DE IMAGEM
        if (!$request->hasFile('image') || !$request->file('image')->isValid()) {
            return response()->json([
                'success' => false,
                'message' => 'Nenhuma imagem válida foi enviada.',
            ], 400);
        }

        $imageFile = $request->file('image');

        // 2. CONVERTE O ARQUIVO PARA BASE64
        // Pega o conteúdo binário do arquivo
        $imageData = file_get_contents($imageFile->getRealPath());

        // Converte para Base64 e adiciona o prefixo de formato de dados (Data URI Scheme)
        // O Replicate geralmente aceita Base64 puro, mas o Data URI é mais seguro.
        $base64Image = 'data:image/' . $imageFile->getClientOriginalExtension() . ';base64,' . base64_encode($imageData);

        $token = env('REPLICATE_API_TOKEN');

        // 3. ENVIA A REQUISIÇÃO PARA O REPLICATE COM BASE64
        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$token}",
                'Content-Type' => 'application/json',
                'Prefer' => 'wait',
            ])->post('https://api.replicate.com/v1/models/recraft-ai/recraft-remove-background/predictions', [
                'input' => [
                    'image' => $base64Image, // AGORA ESTAMOS ENVIANDO A STRING BASE64
                ],
            ]);

            $data = $response->json();

            // Verifica erros de requisição da API (status code)
            if ($response->failed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro na API do Replicate: ' . ($data['detail'] ?? 'Falha desconhecida.'),
                    'data' => $data,
                ], $response->status());
            }

            // Pega a primeira saída do modelo
            $outputUrl = $data['output'] ?? null;

            if ($outputUrl) {
                return response()->json([
                    'success' => true,
                    'output_base64_or_url' => $outputUrl,
                    'replicate_id' => $data['id'] ?? null,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'O Replicate não retornou uma URL de imagem.',
                'data' => $data,
            ], 500);
        } catch (\Exception $e) {
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
    public function upscale(Request $request)
    {
        try {
            // 1️⃣ Verifica se a string Base64 da imagem está no corpo do JSON
            $base64Image = $request->input('image');
            if (empty($base64Image)) {
                Log::error('❌ String Base64 da imagem não encontrada na requisição.');
                return response()->json(['error' => 'Base64 da imagem não enviado'], 400);
            }

            // 2️⃣ Fator de escala (default = 2), limitado a 4×
            $scale = min((int) $request->input('scale', 2), 4);

            // O Base64 recebido já está no formato ideal.

            // 3️⃣ Monta payload
            $payload = [
                'input' => [
                    // Envia a string Base64 recebida
                    'image' => $base64Image,
                    'scale' => $scale
                ]
            ];

            // 4️⃣ Chama a API Replicate com "Prefer: wait"
            // $endpoint = 'https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions';
            $endpoint = 'https://api.replicate.com/v1/models/recraft-ai/recraft-crisp-upscale/predictions';

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
            $payload = [
                'input' => [
                    // Envia a string Base64 recebida
                    'image' => $base64Image,
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

    /* 
     */
}
