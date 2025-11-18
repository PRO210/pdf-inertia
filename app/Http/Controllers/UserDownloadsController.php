<?php

namespace App\Http\Controllers;

use App\Models\CreditUsage;
use App\Models\Payment;
use App\Models\UserDownload;
use Illuminate\Support\Facades\Auth;

use Illuminate\Http\Request;

class UserDownloadsController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
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
