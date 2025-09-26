<?php


namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use MercadoPago\Client\Payment\PaymentClient;
use MercadoPago\Client\Preference\PreferenceClient;
use MercadoPago\Exceptions\MPApiException;
use MercadoPago\MercadoPagoConfig;

class CheckoutController extends Controller
{

    protected $user, $payment;

    public function __construct(User $user, Payment $payment)
    {
        $this->user = $user;
        $this->payment = $payment;
    }

    public function index(Request $request)
    {

        MercadoPagoConfig::setAccessToken(env('VITE_APP_MP_TEST_TOKEN'));

        $client = new PreferenceClient();

        $items = [
            [
                "title" => "Assinatura Mensal",
                "quantity" => 1,
                "currency_id" => "BRL",
                "unit_price" => (float) 50.00
            ]
        ];

        try {
            $preference = $client->create([
                "items" => $items,
                "back_urls" => [
                    // "success" => url('https://bedb5f37c31a.ngrok-free.app/pagamento.success'),
                    // "failure" => url('https://bedb5f37c31a.ngrok-free.app/pagamento.failure'),
                    // "pending" => url('https://bedb5f37c31a.ngrok-free.app/pagamento.pending'),
                    "success" => route('pagamento.success'),
                    "failure" => route('pagamento.failure'),
                    "pending" => route('pagamento.pending'),
                ],
                "auto_return" => "approved",
            ]);

            $orderData = [
                'price' => $items[0]['unit_price'],
                'quantity' => $items[0]['quantity'],
                'amount' => $items[0]['unit_price'] * $items[0]['quantity'],
            ];

            return Inertia::render('MercadoPago/Index', [
                'preferenceId' => $preference->id,
                'orderData' => $orderData,
                'preferenceId' => $preference->id,
                'orderData' => $orderData
            ]);
        } catch (MPApiException $e) {
            // Aqui você vai ver a resposta detalhada da API
            return response()->json([
                'error' => $e->getMessage(),
                'status' => $e->getApiResponse()->getStatusCode(),
                'response' => $e->getApiResponse()->getContent(),

            ], 400);
        }
    }

    /**
     * Cria uma Preferência no Mercado Pago e salva os itens na tabela 'payments'.
     */
    public function create(Request $request)
    {
        // 1. VERIFICAÇÃO DE AUTENTICAÇÃO
        $userId = Auth::id();

        if (!$userId) {
            return response()->json([
                'error' => 'É necessário estar autenticado para realizar esta operação.',
                'message' => 'Usuário não autenticado.'
            ], 401); // 401 Unauthorized
        }


        // 2. Configuração do Mercado Pago
        MercadoPagoConfig::setAccessToken(env('VITE_APP_MP_TEST_TOKEN'));

        // 3. Validação dos dados
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.title' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0.01',
            'items.*.currency_id' => 'required|string',

            'payer.name' => 'required|string',
            'payer.email' => 'required|email',
        ]);


        $client = new PreferenceClient();

        try {
            // 4. Criação da Preferência no Mercado Pago
            $preference = $client->create([
                "items" => $validated['items'],
                "payer" => $validated['payer'],
                "back_urls" => [
                   // "success" => url('https://bedb5f37c31a.ngrok-free.app/pagamento.success'),
                    // "failure" => url('https://bedb5f37c31a.ngrok-free.app/pagamento.failure'),
                    // "pending" => url('https://bedb5f37c31a.ngrok-free.app/pagamento.pending'),
                    "success" => route('pagamento.success'),
                    "failure" => route('pagamento.failure'),
                    "pending" => route('pagamento.pending'),
                ],
                "auto_return" => "approved",
            ]);

            // 5. Salvando os Itens na Tabela 'payments'
            foreach ($validated['items'] as $item) {

                Payment::create([
                    'preference_id'      => $preference->id,
                    'user_id'            => $userId, // Usamos o ID verificado
                    'description'        => $item['title'],
                    'quantity'           => $item['quantity'],
                    'unit_price'         => $item['unit_price'],
                    'status'             => 'pending',
                    'date_created'       => now(),
                ]);
            }

            // 6. Retorno de Sucesso
            return response()->json([
                'success' => true,
                'message' => 'Preferência criada e itens salvos com sucesso.',
                'preferenceId' => $preference->id,
                'preferenceUrl' => $preference->init_point,
                'request' => $request->all()
            ]);
        } catch (MPApiException $e) {
            // 7. Tratamento de Erro do Mercado Pago
            return response()->json([
                'error' => 'Erro ao criar preferência no Mercado Pago.',
                'details' => $e->getMessage(),
                'status' => $e->getApiResponse()?->getStatusCode() ?? 400,
            ], 400);
        }
    }

      
       /**
     * Processa as notificações de webhook do Mercado Pago.
     */
    public function webhook(Request $request)
    {
        // 1. Configuração e Logging Inicial
        MercadoPagoConfig::setAccessToken(env('VITE_APP_MP_TEST_TOKEN'));
        
        // Log para depuração de todo o payload recebido do MP
        Log::info('Webhook Recebido:', ['payload_completo' => $request->all()]);

        // 2. Extração do ID do Pagamento
        $topic = $request->input('type'); 
        $resourceId = $request->input('data.id'); // Este é o ID do pagamento

        if ($topic !== 'payment' || !$resourceId) {
            Log::warning('Webhook ignorado (Tópico ou ID ausente):', ['topic' => $topic, 'id' => $resourceId]);
            return response()->json(['status' => 'ok']);
        }

        try {
            // 3. Busca os detalhes do pagamento na API do Mercado Pago
            $client = new PaymentClient();
            $mpPayment = $client->get($resourceId);

            // 4. EXTRAÇÃO E VERIFICAÇÃO DO PREFERENCE_ID
            // Tenta obter o ID da preferência. O nome da propriedade é geralmente 'preference_id'.
            // Se você usou 'external_reference' no seu create, use essa chave aqui.
            $preferenceId = $mpPayment->preference_id; 
            
            // Log para conferir o ID que será usado na consulta
            Log::info('ID de Preferência do MP:', ['preference_id_mp' => $preferenceId]);

            // 5. Mapeia e Atualiza o Status
            $newStatus = $this->mapMercadoPagoStatus($mpPayment->status);

            // Busca e atualiza todos os itens de pagamento com base no preference_id
            $updatedCount = Payment::where('preference_id', $preferenceId)
                                   ->update(['status' => $newStatus]);

            if ($updatedCount > 0) {
                Log::info('Pagamento atualizado com sucesso.', [
                    'payment_id_mp' => $resourceId,
                    'status_mp' => $mpPayment->status,
                    'status_db' => $newStatus,
                    'registros_afetados' => $updatedCount
                ]);
            } else {
                Log::error('Pagamento não encontrado no DB para o preference_id:', [
                    'preference_id' => $preferenceId, 
                    'payment_id_mp' => $resourceId
                ]);
            }

            // 6. Retorno de Sucesso
            return response()->json(['status' => 'ok']);
            
        } catch (MPApiException $e) {
            // 7. Tratamento de Erro da API
            Log::error('Erro na API do Mercado Pago (MPApiException):', [
                'payment_id' => $resourceId,
                'status' => $e->getApiResponse()?->getStatusCode(),
                'response' => $e->getApiResponse()?->getContent()
            ]);
            return response()->json(['error' => 'Erro ao processar notificação'], 500);
        } catch (\Exception $e) {
            // 8. Tratamento de Erros Gerais (ex: DB, conexão)
            Log::error('Erro interno desconhecido no webhook:', ['erro' => $e->getMessage()]);
            return response()->json(['error' => 'Erro interno do servidor'], 500);
        }
    }
    
    /**
     * Mapeia os status do Mercado Pago para os status internos.
     */
    protected function mapMercadoPagoStatus(string $mpStatus): string
    {
        return match ($mpStatus) {
            'approved' => 'approved',
            'in_process' => 'pending',
            'rejected', 'cancelled' => 'cancelled',
            'refunded' => 'refunded',
            'charged_back' => 'charged_back',
            default => 'pending',
        };
    }
}