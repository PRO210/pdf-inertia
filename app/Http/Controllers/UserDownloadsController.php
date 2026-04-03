<?php

namespace App\Http\Controllers;

use App\Models\CreditUsage;
use App\Models\Payment;
use App\Models\UserDownload;
use Illuminate\Support\Facades\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class UserDownloadsController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    // public function index()
    // {
    //     $downloads = UserDownload::with(['user:id,name,email'])
    //         ->orderBy('updated_at', 'desc')
    //         ->paginate(5)
    //         ->through(fn($item) => [
    //             'id' => $item->id,
    //             'file_name' => $item->file_name,
    //             'count' => $item->count,
    //             'updated_at' => $item->updated_at->format('d/m/Y H:i'),
    //             'user_name' => $item->user?->name ?? 'Usuário Removido',
    //             'user_email' => $item->user?->email,
    //         ]);

    //     // Para ver o JSON exato que vai para o React:
    //     // return response()->json($downloads);

    //     return Inertia::render('Downloads/Index', [
    //         'downloads' => $downloads
    //     ]);
    // }
    public function index(Request $request)
    {
        // Captura os filtros ou define padrões
        $search = $request->input('search');
        $perPage = $request->input('perPage', 5);
        $sortBy = $request->input('sortBy', 'updated_at');
        $sortDir = $request->input('sortDir', 'desc');

        $downloads = UserDownload::query()
            ->with(['user:id,name,email'])
            ->when($search, function ($query, $search) {
                $query->where('file_name', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            })
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->withQueryString() // Mantém os filtros nos links de paginação
            ->through(fn($item) => [
                'id' => $item->id,
                'file_name' => $item->file_name,
                'count' => $item->count,
                'updated_at' => $item->updated_at->format('d/m/Y H:i'),
                'user_name' => $item->user?->name ?? 'Removido',
                'user_email' => $item->user?->email,
            ]);

        return Inertia::render('Downloads/Index', [
            'downloads' => $downloads,
            'filters' => $request->only(['search', 'perPage', 'sortBy', 'sortDir'])
        ]);
    }
      

  
    public function storePacote(Request $request)
    {
        $request->validate([
            'file_name' => 'required|string|max:255',
            'quantidade' => 'required|integer|min:1',
        ]);

        $user = Auth::user();
        $fileName = $request->input('file_name');
        $quantidade = (int) $request->input('quantidade');

        // 1. REGRA: ASSINANTE (Acesso Total)
        $isAssinante = Payment::where('user_id', $user->id)
            ->where('type', 'mensalidade')
            ->where('status', 'approved')
            ->where('date_of_expiration', '>=', now())
            ->exists();

        if ($isAssinante) {
            return $this->registrarDownloadPacote($user, $fileName, $quantidade, 'assinante');
        }

        // 2. REGRA: CRÉDITOS (Saldo em Carteira)
        $totalEntradas = Payment::where('user_id', $user->id)
            ->where('status', 'approved')
            ->sum(DB::raw('quantity * unit_price'));

        $totalGastos = CreditUsage::where('user_id', $user->id)->sum('cost');
        $saldoAtual = $totalEntradas - $totalGastos;

        // Se ele tem saldo, verificamos se o saldo cobre a QUANTIDADE do pacote
        if ($saldoAtual >= $quantidade) {
            return $this->registrarDownloadPacote($user, $fileName, $quantidade, 'credito_ia');
        }

        // 3. REGRA: USUÁRIO FREE
        $limiteFree = (int) env('LIMITE_DOWNLOADS_FREE', 50);
        $registro = UserDownload::where('user_id', $user->id)
            ->where('file_name', $fileName)
            ->first();

        $jaBaixados = $registro ? $registro->count : 0;

        // Se o que ele já baixou + o que quer baixar agora passar do limite... bloqueia.
        if (($jaBaixados + $quantidade) > $limiteFree) {
            return response()->json([
                'error' => 'limite_atingido',
                'message' => "Este pacote de {$quantidade} itens excede seu limite gratuito restante."
            ], 403);
        }

        return $this->registrarDownloadPacote($user, $fileName, $quantidade, 'free');
    }

    /**
     * Função auxiliar para evitar repetição de código (Refatoração)
     */
    private function registrarDownloadPacote($user, $fileName, $quantidade, $tipo)
    {
        $download = UserDownload::firstOrCreate(
            ['user_id' => $user->id, 'file_name' => $fileName]
        );

        $download->increment('count', $quantidade);

        // Se for uso por crédito, registra o gasto na tabela de CreditUsage
        if ($tipo === 'credito_ia') {
            CreditUsage::create([
                'user_id' => $user->id,
                'cost' => $quantidade,
                'description' => "Download de pacote: {$fileName}"
            ]);
        }

        return response()->json([
            'success' => true,
            'total_downloads' => $download->count,
            'tipo_uso' => $tipo
        ]);
    }


    private function calcularSaldo($userId)
    {
        $totalPayments = Payment::where('user_id', $userId)
            ->where('status', 'approved')
            ->get()
            ->sum(fn($p) => $p->quantity * $p->unit_price);

        $totalUsed = CreditUsage::where('user_id', $userId)->sum('cost');

        return round($totalPayments - $totalUsed, 2);
    }

    public function obterSaldo()
    {
        $saldo = $this->calcularSaldo(Auth::id());

        return response()->json([
            'saldo' => $saldo
        ]);
    }

    public function debitarCredito(Request $request)
    {
        $userId = Auth::id();
        $cost = floatval($request->cost);

        $saldoAtual = $this->calcularSaldo($userId); // AGORA É NÚMERO!

        if ($saldoAtual < $cost) {
            return response()->json([
                'success' => false,
                'message' => 'Créditos insuficientes.',
                'current_balance' => $saldoAtual,
            ], 403);
        }

        CreditUsage::create([
            'user_id' => $userId,
            'type' => $request->fileName,
            'cost' => $cost,
            'description' => 'Aumento de imagem via: ' . $request->fileName,
        ]);

        $novoSaldo = round($saldoAtual - $cost, 2);

        if (abs($novoSaldo) < 0.01) {
            $novoSaldo = 0; // Limpa lixo decimal
        }

        return response()->json([
            'success' => true,
            'message' => 'Créditos descontados com sucesso.',
            'new_balance' => $novoSaldo,
        ]);
    }


    public function store(Request $request)
    {
        $user = Auth::user();
        $fileName = $request->file_name;

        // 1. CHECAR ASSINATURA ATIVA
        $isAssinante = Payment::where('user_id', $user->id)
            ->where('type', 'mensalidade')
            ->where('status', 'approved')
            ->where('date_of_expiration', '>=', now())
            ->exists();

        if ($isAssinante) {
            return $this->registrarDownload($user, $fileName, 'assinante');
        }

        // 2. CHECAR CRÉDITOS EXTRAS
        $totalEntradas = Payment::where('user_id', $user->id)
            ->where('status', 'approved')
            ->sum(DB::raw('quantity * unit_price'));

        $totalGastos = CreditUsage::where('user_id', $user->id)->sum('cost');
        $saldo = $totalEntradas - $totalGastos;

        // SÓ ENTRA AQUI SE TIVER SALDO
        if ($saldo > 0) {
            return $this->registrarDownload($user, $fileName, 'credito_ia');
        }

        // 3. REGRA PARA USUÁRIO FREE (O código só chega aqui se os IFs acima falharem)
        $contagem = UserDownload::where('user_id', $user->id)
            ->where('file_name', $fileName)
            ->first();

        $limiteFree = env('LIMITE_DOWNLOADS_FREE', 50);

        // Verificamos se ele já tem registro e se esse registro passou do limite
        if ($contagem && $contagem->count >= $limiteFree) {
            return response()->json([
                'error' => 'limite_atingido',
                'message' => 'Você atingiu o limite gratuito.'
            ], 403);
        }

        // Se chegou até aqui, é Free e está dentro do limite
        return $this->registrarDownload($user, $fileName, 'free');
    }

    /**
     * Função auxiliar para não repetir código de incremento
     */
    private function registrarDownload($user, $fileName, $via)
    {
        $download = UserDownload::firstOrCreate(
            ['user_id' => $user->id, 'file_name' => $fileName],
            ['count' => 0]
        );

        $download->increment('count');

        return response()->json([
            'success' => true,
            'via' => $via, // informa se foi via assinatura, crédito ou free
            'total_downloads' => $download->count,
        ]);
    }

    /* 
    
    */
}
