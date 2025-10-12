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
        return Inertia::render('MercadoPago/Index');
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
            ], 401);
        }

        // 2. Configuração do Mercado Pago
        $accessToken = env('APP_ENV') === 'production'
            ? env('VITE_APP_MP_PROD_TOKEN')
            : env('VITE_APP_MP_TEST_TOKEN');

        MercadoPagoConfig::setAccessToken($accessToken);

        // 3. Validação dos dados (agora só 1 item)
        $item = $request->input('items.0'); // Pega o primeiro item do array

        $validated = validator([
            'item' => $item,
            'payer' => $request->input('payer'),
        ], [
            'item.title' => 'required|string|max:255',
            'item.quantity' => 'required|integer|min:1',
            'item.unit_price' => 'required|numeric|min:0.01',
            'item.currency_id' => 'required|string|size:3',
            'payer.name' => 'required|string|max:255',
            'payer.email' => 'required|email',
        ])->validate();


        $client = new PreferenceClient();

        try {
            // 4. Salvando o Item na Tabela 'payments'
            $payment = Payment::create([
                'preference_id'      => null,
                'user_id'            => $userId,
                'description'        => $validated['item']['title'],
                'quantity'           => $validated['item']['quantity'],
                'unit_price'         => $validated['item']['unit_price'],
                'status'             => 'pending',
                'date_created'       => now(),
            ]);

            // 5. Criar a preferência no Mercado Pago
            $preference = $client->create([
                "items" => [
                    [
                        "title" => $validated['item']['title'],
                        "quantity" => $validated['item']['quantity'],
                        "unit_price" => $validated['item']['unit_price'],
                        "currency_id" => $validated['item']['currency_id'],
                    ]
                ],
                "payer" => $validated['payer'],
                "external_reference" => (string) $payment->id,
                // "notification_url" => url('https://02e26f96c87a.ngrok-free.app/webhooks/mercadopago'),
                "notification_url" => url('https://pdfeditor.proandre.com.br/webhooks/mercadopago'),
                "back_urls" => [
                    "success" => route('pagamento.retorno'),
                    "failure" => route('pagamento.retorno'),
                    "pending" => route('pagamento.retorno'),
                    // "success" => url('https://02e26f96c87a.ngrok-free.app/pagamento.retorno'),
                    // "failure" => url('https://02e26f96c87a.ngrok-free.app/pagamento.retorno'),
                    // "pending" => url('https://02e26f96c87a.ngrok-free.app/pagamento.retorno'),
                ],
                "auto_return" => "approved",
            ]);

            // 6. Atualizar registro local com preference_id
            $payment->update([
                'preference_id' => $preference->id,
            ]);

            // 7. Retorno de Sucesso
            return response()->json([
                'success' => true,
                'message' => 'Preferência criada e item salvo com sucesso.',
                'preferenceId' => $preference->id,
                'preferenceUrl' => $preference->init_point
            ]);
        } catch (MPApiException $e) {
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
        // 1. Configuração do Token de Acesso (Teste ou Produção)
        $accessToken = env('APP_ENV') === 'production'
            ? env('VITE_APP_MP_PROD_TOKEN')
            : env('VITE_APP_MP_TEST_TOKEN');


        MercadoPagoConfig::setAccessToken($accessToken);

        // Log para depuração do payload recebido
        Log::info('Webhook Recebido:', ['payload_completo' => $request->all()]);

        // 2. Extração do Tópico e ID do Pagamento
        $topic = $request->input('topic') ?? $request->input('type');
        $resourceId = $request->input('id') ?? $request->input('data.id');

        if ($topic !== 'payment' || !$resourceId) {
            Log::warning('Webhook ignorado (Tópico ou ID ausente):', [
                'topic' => $topic,
                'id' => $resourceId
            ]);
            return response()->json(['status' => 'ok']);
        }

        sleep(10);

        try {
            // 3. Busca os detalhes completos do pagamento na API do Mercado Pago
            $client = new PaymentClient();
            $mpPayment = $client->get($resourceId);

            // 4. Pegando o external_reference (id do seu registro local)
            $externalReference = $mpPayment->external_reference ?? null;

            if (!$externalReference) {
                Log::error('External_reference ausente no pagamento', [
                    'payment_id_mp' => $resourceId,
                    'payment_object' => $mpPayment
                ]);
                return response()->json(['error' => 'external_reference ausente'], 400);
            }

            // 5. Atualiza o status no DB usando o ID interno com retries
            $paymentId = (int) $externalReference;
            $newStatus = $this->mapMercadoPagoStatus($mpPayment->status);
            $maxRetries = 3;
            $attempt = 0;
            $updated = false;

            while ($attempt < $maxRetries && !$updated) {
                $payment = Payment::find($paymentId);

                if ($payment) {
                    $payment->update([
                        'status' => $newStatus,
                        'payment_id' => $resourceId,
                        'date_approved' => $mpPayment->date_approved ?? null,
                    ]);

                    $updated = true;
                    Log::info('Pagamento atualizado com sucesso.', [
                        'payment_id_local' => $paymentId,
                        'payment_id_mp' => $resourceId,
                        'status_mp' => $mpPayment->status,
                        'status_db' => $newStatus,
                        'attempt' => $attempt + 1
                    ]);
                } else {
                    $attempt++;
                    Log::warning("Pagamento não encontrado no DB, retry #$attempt em 10s", [
                        'external_reference' => $externalReference,
                        'payment_id_mp' => $resourceId
                    ]);
                    sleep(10); // espera 1 minuto antes de tentar novamente
                }
            }

            if (!$updated) {
                Log::error('Falha ao atualizar pagamento após várias tentativas.', [
                    'external_reference' => $externalReference,
                    'payment_id_mp' => $resourceId
                ]);
            }

            return response()->json(['status' => 'received']);
        } catch (MPApiException $e) {
            Log::error('Erro na API do Mercado Pago (MPApiException):', [
                'payment_id' => $resourceId,
                'status' => $e->getApiResponse()?->getStatusCode(),
                'response' => $e->getApiResponse()?->getContent()
            ]);
            return response()->json(['error' => 'Erro ao processar notificação'], 500);
        } catch (\Exception $e) {
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


    /**
     * Sincroniza um pagamento específico (opcional) e sempre retorna a lista completa.
     * GET /pagamentos/sincronizar/{preferenceId?}
     */
    public function sincronizar(Request $request, $preferenceId = null)
    {
        $updated = false;
        $updatedPaymentId = null;
        $messages = [];
        $user = $request->user(); 

        if ($preferenceId) {
            // Tenta encontrar o pagamento local
            $payment = Payment::where('preference_id', $preferenceId)->first();

            if ($payment) {
                // Exemplo: atualizar status recebido via query string (opcional)
                // Você pode também chamar a API do Mercado Pago aqui para confirmar status verdadeiro.
                if ($request->has('status')) {
                    $payment->status = $request->input('status');
                } else {
                    // Se quiser, consulte a API do Mercado Pago aqui e atualize $payment->status conforme retorno.
                    // Ex: $mpStatus = $this->consultaMercadoPago($preferenceId);
                    // $payment->status = $mpStatus ?? $payment->status;
                }

                $payment->save();
                $updated = true;
                $updatedPaymentId = $payment->id;
                $messages[] = "Pagamento com preference_id {$preferenceId} atualizado.";
            } else {
                $messages[] = "Pagamento com preference_id {$preferenceId} não encontrado localmente.";
                // Opcional: criar registro local a partir dos dados do request
                // Payment::create([...]);
            }
        } else {
            $messages[] = "Nenhum preference_id informado — retornando apenas a lista.";
        }

        // Retorna apenas os pagamentos do usuário logado
        $payments = Payment::with('user')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();


        return response()->json([
            'updated' => $updated,
            'updated_payment_id' => $updatedPaymentId,
            'messages' => $messages,
            'payments' => $payments,
        ]);
    }
}
