<?php

use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\MercadoPagoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::get('/teste', function () {
  return response()->json(['message' => 'ok']);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
  return response()->json([
    'user' => $request->user(),
    'message' => 'Usuário autenticado'
  ]);
});


Route::post('mp/webhook/mercadopago', [CheckoutController::class, 'webhook'])->name('mp.webhook');
