<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Lista usuários para a tabela (Inertia).
     *
     * Query params suportados:
     *  - perPage (int)      : itens por página (default 10)
     *  - page (int)         : página
     *  - search (string)    : pesquisa por nome ou email
     *  - sortBy (string)    : coluna para ordenação (id, name, email, created_at)
     *  - sortDir (string)   : asc | desc
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('perPage', 5);
        $search  = $request->get('search', null);

        // Ler sort vindo do frontend — aceita ambos os nomes
        $sortBy = $request->get('sortBy', null);
        // aceitar tanto sortDir quanto sortDirection
        $sortDir = $request->get('sortDir', $request->get('sortDirection', null));

        // query base
        $query = User::query()
            ->select('id', 'name', 'email', 'created_at');

        // filtro de busca
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // proteção contra sortBy inválido - permita somente colunas conhecidas
        $allowedSorts = ['id', 'name', 'email', 'created_at'];

        // normaliza sortDir para null/asc/desc
        if ($sortDir !== null) {
            $sd = strtolower($sortDir);
            if (!in_array($sd, ['asc', 'desc'])) {
                $sd = null;
            }
            $sortDir = $sd;
        }

        // aplicar ordenação somente se sortBy não vazio e for permitido
        if (!empty($sortBy) && in_array($sortBy, $allowedSorts) && !empty($sortDir)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            // fallback consistente — se quiser que por padrão venha por id desc:
            $query->orderBy('id', 'desc');
        }

        // paginação com transformação (retorna só campos necessários)
        $users = $query->paginate($perPage)
            ->withQueryString()
            ->through(fn($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'created_at' => $user->created_at?->toDateTimeString(),
            ]);

        // devolve para a página Inertia (vue/react)
        return Inertia::render('Users/Index', [
            'users'   => $users,
            'filters' => $request->only(['search', 'perPage', 'sortBy', 'sortDir', 'sortDirection']),
        ]);
    }
}
