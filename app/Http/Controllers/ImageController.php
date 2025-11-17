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

    // // 🔹 2. Aumentar qualidade (Upscale com IA)
    // public function upscale(Request $request)
    // {
    //     try {
    //         // 1️⃣ Verifica se há arquivo
    //         if (!$request->hasFile('image')) {
    //             Log::error('❌ Nenhum arquivo de imagem enviado.');
    //             return response()->json(['error' => 'Nenhum arquivo enviado'], 400);
    //         }

    //         $image = $request->file('image');

    //         if (!$image->isValid()) {
    //             Log::error('❌ Arquivo inválido.', ['erro' => $image->getErrorMessage()]);
    //             return response()->json(['error' => 'Arquivo inválido'], 400);
    //         }

    //         // 2️⃣ Salva a imagem temporariamente, REDIMENSIONA SE NECESSÁRIO E CONVERTE PARA BASE64
    //         $originalName = str_replace(' ', '_', $image->getClientOriginalName());
    //         $uniqueName = pathinfo($originalName, PATHINFO_FILENAME) . '-' . uniqid() . '.' . $image->getClientOriginalExtension();
    //         $path = $image->storeAs('temp', $uniqueName, 'public');
    //         $storagePath = storage_path('app/public/' . $path);
    //         $fileMimeType = $image->getMimeType();

    //         // 🛑 NOVO CÓDIGO: VERIFICAÇÃO E REDIMENSIONAMENTO PARA O LIMITE DA GPU 🛑
    //         $MAX_PIXELS = 2096704; // Limite de 2.1 MP (2096704 pixels)

    //         // Tenta carregar a imagem para verificar as dimensões e redimensionar
    //         $img = null;
    //         if ($fileMimeType == 'image/jpeg' || $fileMimeType == 'image/jpg') {
    //             $img = @imagecreatefromjpeg($storagePath);
    //         } elseif ($fileMimeType == 'image/png') {
    //             $img = @imagecreatefrompng($storagePath);
    //         }

    //         if ($img) {
    //             $width = imagesx($img);
    //             $height = imagesy($img);

    //             // Verifica se o total de pixels excede o limite
    //             if ($width * $height > $MAX_PIXELS) {

    //                 // Calcula a nova altura máxima (mantendo a proporção)
    //                 // Usamos a fórmula: Altura_quadrada <= MAX_PIXELS / Proporção
    //                 $aspectRatio = $width / $height;
    //                 $newHeight = (int) floor(sqrt($MAX_PIXELS / $aspectRatio));
    //                 $newWidth = (int) floor($newHeight * $aspectRatio);

    //                 // Redimensiona a imagem usando GD
    //                 $resizedImg = imagecreatetruecolor($newWidth, $newHeight);
    //                 imagecopyresampled($resizedImg, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    //                 // Sobrescreve o arquivo temporário com a versão redimensionada
    //                 if ($fileMimeType == 'image/jpeg' || $fileMimeType == 'image/jpg') {
    //                     imagejpeg($resizedImg, $storagePath, 90);
    //                 } elseif ($fileMimeType == 'image/png') {
    //                     imagepng($resizedImg, $storagePath);
    //                 }

    //                 imagedestroy($img);
    //                 imagedestroy($resizedImg);

    //                 Log::info('⚠️ Imagem redimensionada para atender ao limite da GPU.', ['Original' => "{$width}x{$height}", 'Novo' => "{$newWidth}x{$newHeight}"]);
    //             } else {
    //                 imagedestroy($img);
    //             }
    //         } else {
    //             Log::warning('⚠️ Não foi possível carregar a imagem com GD para verificação. Prosseguindo sem redimensionar.');
    //         }
    //         // 🛑 FIM DO CÓDIGO DE REDIMENSIONAMENTO 🛑


    //         // 🛑 MUDANÇA 1: Converte o arquivo salvo (agora potencialmente redimensionado) para Base64 Data URL
    //         $imageData = file_get_contents($storagePath);
    //         $base64Image = 'data:' . $fileMimeType . ';base64,' . base64_encode($imageData);

    //         // Mantém $imageUrl apenas para registro e retorno
    //         $imageUrl = "https://pdfeditor.proandre.com.br/storage/" . $path;

    //         Log::info('✅ Imagem salva e Base64 gerado com sucesso.', [
    //             'path' => $path,
    //             'url_original' => $imageUrl,
    //             // Loga o início da string Base64 para confirmação
    //             'base64_preview' => substr($base64Image, 0, 50) . '...'
    //         ]);

    //         // 3️⃣ Fator de escala (default = 2)
    //         $scale = (int) $request->input('scale', 2);

    //         // 4️⃣ Monta payload igual ao do CURL
    //         $payload = [
    //             'input' => [
    //                 // 🛑 MUDANÇA 2: Envia a string Base64 no lugar da URL
    //                 'image' => $base64Image,
    //                 'scale' => $scale
    //             ]
    //         ];

    //         // 5️⃣ Chama a API Replicate com "Prefer: wait"
    //         $endpoint = 'https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions';

    //         $response = Http::withHeaders([
    //             'Authorization' => 'Bearer ' . env('REPLICATE_API_TOKEN'),
    //             'Content-Type' => 'application/json',
    //             'Prefer' => 'wait',
    //         ])->post($endpoint, $payload);

    //         // 6️⃣ Verifica resposta
    //         if (!$response->successful()) {
    //             Log::error('❌ Erro ao chamar Replicate', [
    //                 'status' => $response->status(),
    //                 'body' => $response->body(),
    //                 'payload_sample' => array_merge($payload['input'], ['image' => '...base64_data_omitted...']), // Não logar Base64 inteiro
    //             ]);

    //             return response()->json([
    //                 'error' => 'Falha ao chamar Replicate',
    //                 'replicate_response' => $response->json(),
    //             ], $response->status());
    //         }

    //         $result = $response->json();

    //         // O output será uma URL ou, mais provavelmente, a imagem upscalada em Base64 Data URL
    //         $outputValue = $result['output'] ?? null;

    //         Log::info('✅ Upscale concluído.', [
    //             'status' => $result['status'] ?? 'unknown',
    //             'output_type' => is_string($outputValue) ? (substr($outputValue, 0, 5) == 'data:' ? 'Base64' : 'URL') : 'null',
    //         ]);

    //         // 7️⃣ Retorna JSON com o resultado
    //         return response()->json([
    //             'success' => true,
    //             // 🛑 MUDANÇA 3: Renomeia o campo de retorno para maior clareza
    //             'output_base64_or_url' => $outputValue,
    //             'url_original' => $imageUrl,
    //             'replicate_id' => $result['id'] ?? null,
    //         ]);
    //     } catch (\Exception $e) {
    //         Log::error('💥 Erro inesperado no upscale()', [
    //             'mensagem' => $e->getMessage(),
    //             'linha' => $e->getLine(),
    //             'arquivo' => $e->getFile(),
    //         ]);

    //         return response()->json(['error' => 'Erro interno: ' . $e->getMessage()], 500);
    //     }
    // }

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
}
