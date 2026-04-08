<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\UserDownload;
use Illuminate\Support\Facades\Log;

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

    if ($debug) {
      Log::info('UserAlertService iniciado', [
        'user_id' => $user->id ?? null
      ]);
    }

    if (!$user) {
      if ($debug) {
        Log::info('Usuário inválido');
      }
      return ['showAlert' => false];
    }

    // 🔹 Limite de downloads do plano gratuito (config)
    $limitFree = (int) config('services.downloads.limite_free', 50);

    if ($debug) {
      Log::info('Limite carregado', [
        'limitFree' => $limitFree
      ]);
    }

    // 🔹 Total de downloads relevantes do usuário
    $currentUsage = UserDownload::where('user_id', $user->id)
      ->where(function ($query) {
        $query->where('file_name', 'LIKE', '%poster.pdf%')
          ->orWhere('file_name', 'LIKE', '%atividades.pdf%')
          ->orWhere('file_name', 'LIKE', '%mascara.pdf%');
      })
      ->sum('count');

    if ($debug) {
      Log::info('Uso atual calculado', [
        'currentUsage' => $currentUsage
      ]);
    }

    // 🔹 Verifica se a assinatura vence hoje
    $expiresToday = Payment::where('user_id', $user->id)
      ->where('type', 'mensalidade')
      ->where('status', 'approved')
      ->whereDate('date_of_expiration', now()->toDateString())
      ->exists();

    if ($debug) {
      Log::info('Verificação de expiração', [
        'expiresToday' => $expiresToday
      ]);
    }

    // 🔹 Define limite de alerta (90%)
    $threshold = $limitFree * 0.9;
    $isLimitNear = ($currentUsage >= $threshold);

    if ($debug) {
      Log::info('Verificação de limite', [
        'threshold_90_percent' => $threshold,
        'isLimitNear' => $isLimitNear
      ]);
    }

    // 🔹 Se não há risco nem expiração → não mostra alerta
    if (!$expiresToday && !$isLimitNear) {
      if ($debug) {
        Log::info('Nenhum alerta será exibido');
      }
      return ['showAlert' => false];
    }

    // 🔹 Define tipo de alerta
    $type = $expiresToday ? 'expiration' : 'limit';

    if ($debug) {
      Log::info('Alerta ativado', [
        'type' => $type
      ]);
    }

    return [
      'showAlert' => true,
      'type'      => $type,
      'usage'     => (int) $currentUsage,
      'limit'     => $limitFree,
      'message'   => $expiresToday
        ? 'Sua assinatura vence hoje! Renove para continuar com acesso total.'
        : ($currentUsage >= $limitFree
          ? "Você atingiu seu limite de $limitFree criações. Assine o plano PRO para continuar gerando arquivos!"
          : "Atenção: você já realizou $currentUsage de $limitFree criações permitidas no plano grátis."),
      'id'        => $type . '_' . ($expiresToday ? now()->format('Y-m-d') : 'reached')
    ];
  }
}