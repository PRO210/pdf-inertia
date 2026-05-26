<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\UserDownload;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class UserAlertService
{
  /**
   * Retorna o status de alerta do usuário com base em:
   *
   * 1. Expiração da assinatura (vence hoje)
   * 2. Uso do limite do plano gratuito (>= 90%)
   *
   * Regras:
   * - Se não houver usuário → não exibe alerta
   * - Se a assinatura vence hoje → alerta de expiração
   * - Se o uso atingir 90% do limite → alerta de limite
   * - Caso contrário → nenhum alerta
   *
   * Tipos de alerta:
   * - expiration → assinatura vence hoje
   * - limit → usuário próximo ou atingiu limite
   *
   * Logs:
   * - Ativos apenas em ambiente local (debug)
   *
   * @param  object|null $user  Usuário autenticado
   * @return array{
   *   showAlert: bool,
   *   type?: string,
   *   usage?: int,
   *   limit?: int,
   *   message?: string,
   *   id?: string
   * }
   */
  public function getStatus($user)
  {
    $debug = app()->environment('local');

    if (!$user) {
      if ($debug) Log::info('UserAlertService: Nenhum usuário autenticado.');
      return ['showAlert' => false];
    }

    if ($debug) {
      Log::info('UserAlertService: Iniciando verificação', ['user_id' => $user->id]);
    }

    // 1. Verificar se o usuário possui assinatura PRO ativa (não vencida)
    $activeSubscription = Payment::where('user_id', $user->id)
      ->where('type', 'mensalidade')
      ->where('status', 'approved')
      ->whereDate('date_of_expiration', '>', now())
      ->orderBy('date_of_expiration', 'desc')
      ->first();

    $isPro = (bool) $activeSubscription;

    // 2. Verificar se a assinatura vence HOJE (exatamente hoje)
    $expiresToday = false;
    if ($isPro) {
      $expiresToday = Carbon::parse($activeSubscription->date_of_expiration)->isToday();
    }

    if ($debug) {
      Log::info('UserAlertService: Status da assinatura', [
        'is_pro' => $isPro,
        'expires_today' => $expiresToday,
        'expiration_date' => $activeSubscription->date_of_expiration ?? 'N/A'
      ]);
    }

    // 3. Se o usuário é PRO e NÃO vence hoje, não há motivo para alerta.
    if ($isPro && !$expiresToday) {
      if ($debug) Log::info('UserAlertService: Usuário PRO com assinatura em dia. Sem alertas.');
      return ['showAlert' => false];
    }

    // 4. Se chegou aqui e NÃO é PRO, verificamos o limite do plano FREE
    $limitFree = (int) config('services.downloads.limite_free', 50);
    $currentUsage = (int) UserDownload::where('user_id', $user->id)
      ->where(function ($query) {
        $query->where('file_name', 'LIKE', '%poster.pdf%')
          ->orWhere('file_name', 'LIKE', '%atividades.pdf%')
          ->orWhere('file_name', 'LIKE', '%mascara.pdf%')
          ->orWhere('file_name', 'LIKE', '%editor_pdf.pdf%');
      })
      ->sum('count');

    $threshold = $limitFree * 0.9;
    $hasReachedLimit = ($currentUsage >= $limitFree);
    $isLimitNear = ($currentUsage >= $threshold);

    if ($debug) {
      Log::info('UserAlertService: Verificação de uso Free', [
        'usage' => $currentUsage,
        'limit' => $limitFree,
        'is_limit_near' => $isLimitNear,
        'has_reached_limit' => $hasReachedLimit
      ]);
    }

    // --- LÓGICA DE RETORNO DOS ALERTAS ---

    // Caso A: Assinatura PRO vence hoje
    if ($expiresToday) {
      return [
        'showAlert' => true,
        'type'      => 'expiration',
        'message'   => 'Sua assinatura vence hoje! Renove para continuar com acesso total.',
        'id'        => 'exp_' . now()->format('Y-m-d')
      ];
    }

    // Caso B: Usuário FREE atingiu ou está perto do limite
    if (!$isPro && $isLimitNear) {
      return [
        'showAlert' => true,
        'type'      => 'limit',
        'usage'     => $currentUsage,
        'limit'     => $limitFree,
        'isBlocked' => $hasReachedLimit, // Útil para você bloquear o botão de download no front
        'message'   => $hasReachedLimit
          ? "Você atingiu seu limite de $limitFree criações. Assine o plano PRO para continuar!"
          : "Atenção: você já realizou $currentUsage de $limitFree criações permitidas no plano grátis.",
        'id'        => 'limit_' . ($hasReachedLimit ? 'blocked' : 'near')
      ];
    }

    return ['showAlert' => false];
  }
}
