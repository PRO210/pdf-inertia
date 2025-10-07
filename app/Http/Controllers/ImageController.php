<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ImageController extends Controller
{
    // 🔹 1. Remover fundo da imagem
    public function removeBackground(Request $request)
    {

        // Recebe a URL da imagem do usuário
        $imageUrl = $request->input('image');

        $token = env('REPLICATE_API_TOKEN');

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$token}",
            'Content-Type' => 'application/json',
            'Prefer' => 'wait', // espera o processamento terminar
        ])->post('https://api.replicate.com/v1/models/recraft-ai/recraft-remove-background/predictions', [
            'input' => [
                'image' => $imageUrl,
            ],
        ]);

        $data = $response->json();

        // Pega a primeira saída do modelo
        $outputUrl = $data['output'][0] ?? null;

        if ($outputUrl) {
            return response()->json([
                'success' => true,
                'output' => $outputUrl,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Erro ao processar a imagem.',
            'data' => $data,
        ], 500);
    }

    // 🔹 2. Aumentar qualidade (Upscale 4x com IA)
    public function upscale(Request $request)
    {
        $request->validate(['image' => 'required|image']);
        $path = $request->file('image')->store('temp', 'public');
        $imageUrl = asset(Storage::url($path));

        $response = Http::withToken(env('REPLICATE_API_TOKEN'))
            ->post('https://api.replicate.com/v1/predictions', [
                'version' => 'c4b5c04c9f331b8a3cdd7ed1b7da8c734fa8b530165fc4b437c6f8e640d8c9ef', // modelo Real-ESRGAN 4x
                'input' => ['image' => $imageUrl],
            ]);

        $output = $response->json();

        return response()->json($output);
    }
}
