<?php

namespace App\Http\Controllers;

use App\Models\CreditUsage;
use App\Models\Payment;
use App\Models\UserDownload;
use Illuminate\Support\Facades\Auth;

use Illuminate\Http\Request;
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

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'file_name' => 'required|string|max:255',
        ]);

        $user = Auth::user();
        $fileName = $request->input('file_name');

        $download = UserDownload::firstOrCreate(
            ['user_id' => $user->id, 'file_name' => $fileName],
            ['count' => 0]
        );

        $download->increment('count');

        return response()->json([
            'success' => true,
            'message' => 'Download contabilizado com sucesso.',
            'total_downloads' => $download->count,
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

    /* 
    
    */
}
