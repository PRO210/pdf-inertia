<?php


namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
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
                    "success" => url('https://1a34bec56bdc.ngrok-free.app/pagamento.success'),
                    "failure" => url('https://1a34bec56bdc.ngrok-free.app/pagamento.failure'),
                    "pending" => url('https://1a34bec56bdc.ngrok-free.app/pagamento.pending'),
                    // "success" => route('pagamento.success'),
                    // "failure" => route('pagamento.failure'),
                    // "pending" => route('pagamento.pending'),
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



    public function create(Request $request)
    {

        MercadoPagoConfig::setAccessToken(env('VITE_APP_MP_TEST_TOKEN'));

        // Validação dos dados recebidos
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.title' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.currency_id' => 'required|string',
            'payer.name' => 'required|string',
            'payer.email' => 'required|email',
        ]);

        $client = new PreferenceClient();

        try {
            $preference = $client->create([
                "items" => $validated['items'],
                "payer" => $validated['payer'],
                "back_urls" => [
                    "success" => url('https://1a34bec56bdc.ngrok-free.app/pagamento.success'),
                    "failure" => url('https://1a34bec56bdc.ngrok-free.app/pagamento.failure'),
                    "pending" => url('https://1a34bec56bdc.ngrok-free.app/pagamento.pending')
                    // "success" => route('pagamento.success'),
                    // "failure" => route('pagamento.failure'),
                    // "pending" => route('pagamento.pending'),
                ],
                "auto_return" => "approved",
            ]);

            return response()->json([
                'success' => true,
                'preferenceId' => $preference->id,
                'preferenceUrl' => $preference->init_point,
                'preference' => $preference
            ]);
        } catch (MPApiException $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'status' => $e->getApiResponse()?->getStatusCode() ?? 400,
                'response' => $e->getApiResponse()?->getContent(),
                'request' => $request->all()
            ], 400);
        }
    }



    public function webhook(Request $request)
    {
        // Lógica para processar a notificação do MercadoPago
        $data = $request->all();

        // Verifique o tipo de evento e processe conforme necessário
        if (isset($data['type']) && $data['type'] === 'payment') {
            $paymentId = $data['data']['id'];
            // Aqui você pode buscar o pagamento e atualizar o status no seu sistema
            // Exemplo: $payment = MercadoPago\Payment::find_by_id($paymentId);
            // Atualize o status do pedido no seu banco de dados conforme o status do pagamento
        }

        return response()->json(['status' => 'ok']);
    }
}
