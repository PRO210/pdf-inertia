<?php

use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\PdfEditorController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as MiddlewareVerifyCsrfToken;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard/pdf-editor', [PdfEditorController::class, 'index'])->name('pdf.editor');
    Route::post('/dashboard/pdf-editor', [PdfEditorController::class, 'store'])->name('pdf.editor.store');

    Route::get('/dashboard/pdf-atividades', [PdfEditorController::class, 'atividades'])->name('pdf.atividades');
});

Route::get('/forgot-password', [PasswordResetLinkController::class, 'create'])->middleware('guest')->name('password.request');
Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])->middleware('guest')->name('password.email');

Route::get('/reset-password/{token}', [NewPasswordController::class, 'create'])->middleware('guest')->name('password.reset');
Route::post('/reset-password', [NewPasswordController::class, 'store'])->middleware('guest')->name('password.update');

Route::post('/cortar-imagem', [PdfEditorController::class, 'cortarImagem']);
Route::post('/colar-imagem', [PdfEditorController::class, 'colarImagem']);





Route::get('/pagamentos', [App\Http\Controllers\CheckoutController::class, 'index'])->name('pdf.pagamentos');


Route::post('/create_preference', [App\Http\Controllers\CheckoutController::class, 'create'])->name('mp.create_preference');

// routes/web.php
Route::get('/pagamento/success', fn() => 'Pagamento aprovado')->name('pagamento.success');
Route::get('/pagamento/failure', fn() => 'Pagamento falhou')->name('pagamento.failure');
Route::get('/pagamento/pending', fn() => 'Pagamento pendente')->name('pagamento.pending');

// routes/web.php

// Route::get('/api/teste', function () {
//     return response()->json(['message' => 'ok']);
// });

Route::post('/webhooks/mercadopago', [CheckoutController::class, 'webhook'])
    ->withoutMiddleware([MiddlewareVerifyCsrfToken::class])
    ->name('mp.webhook');






require __DIR__ . '/auth.php';
