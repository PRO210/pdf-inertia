<?php

use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\ImageController;
use App\Http\Controllers\PdfEditorController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserDownloadsController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as MiddlewareVerifyCsrfToken;



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
Route::middleware('auth')->group(function () {
   Route::get('/users', [UserController::class, 'index'])->name('users.index');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard/pdf-editor', [PdfEditorController::class, 'index'])->name('pdf.editor');
    Route::post('/dashboard/pdf-editor', [PdfEditorController::class, 'store'])->name('pdf.editor.store');

    Route::get('/dashboard/pdf-atividades', [PdfEditorController::class, 'atividades'])->name('pdf.atividades');

    Route::get('/dashboard/tratamento-imagens', [ImageController::class, 'index'])->name('tratamento.imagens');
    // Route::get('/dashboard/upscale/temp-images', [ImageController::class, 'getTemporaryUpscaleImages'])->name('upscale.temp.images');

    // Rota 1: Upscale
    Route::get('/dashboard/upscale/temp-images', [ImageController::class, 'getTemporaryImages'])->name('upscale.temp.images');
    Route::post('/dashboard/save-final-image', [ImageController::class, 'saveFinalImage'])->name('save.final.image');

    // Rota 2: Remove Background (RMBG)
    Route::get('/dashboard/removebg/temp-images', [ImageController::class, 'getTemporaryImages'])->name('removebg.temp.images');

    // Rota 3: Image To Anime (ITAT)
    Route::get('/dashboard/imagetoanime/temp-images', [ImageController::class, 'getTemporaryImages'])->name('imagetoanime.temp.images');
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

Route::get('/pagamento/retorno', function () {
    return Inertia::render('Pagamentos/Index', [
        'status' => request('status'), // "approved", "pending", "failure"...
        'mensagem' => match (request('status')) {
            'approved' => 'Pagamento aprovado!',
            'pending' => 'Pagamento pendente.',
            'failure', 'rejected' => 'Pagamento falhou.',
            default => 'Status desconhecido.'
        },
        'detalhes' => request()->all(),
    ]);
})->name('pagamento.retorno');

Route::middleware(['auth'])->get('/pagamentos/sincronizar/{preferenceId?}', [CheckoutController::class, 'sincronizar'])
    ->name('pagamentos.sincronizar');


Route::post('/webhooks/mercadopago', [CheckoutController::class, 'webhook'])
    ->withoutMiddleware([MiddlewareVerifyCsrfToken::class])
    ->name('mp.webhook');

// GET público
Route::get('/publico', function () {
    return response()->json([
        'status' => 'ok',
        'mensagem' => 'Rota GET pública funcionando!'
    ]);
});

// POST público (sem CSRF)
Route::post('/publico-post', function (Request $request) {
    return response()->json([
        'status' => 'ok',
        'mensagem' => 'Rota POST pública funcionando!',
        'dados_recebidos' => $request->all()
    ]);
})->withoutMiddleware([MiddlewareVerifyCsrfToken::class]);


Route::post('/imagens/remover-fundo', [ImageController::class, 'removeBackground']);
Route::post('/imagens/aumentar-qualidade', [ImageController::class, 'upscale']);


Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard/imagem-to-anime/create', [ImageController::class, 'createImageToAnime'])->name('imagem-to-anime.create');
    Route::post('/imagens/imagem-to-anime', [ImageController::class, 'imageToAnime']);
});


Route::post('/user-downloads', [UserDownloadsController::class, 'store'])
    ->middleware('auth')
    ->name('user.downloads.store');

Route::post('/user-downloads-carteira', [UserDownloadsController::class, 'carteira'])
    ->middleware('auth')
    ->name('user.downloads.carteira');

Route::get('user-download-obterSaldo', [UserDownloadsController::class, 'obterSaldo'])
    ->middleware('auth')
    ->name('user.downloads.obterSaldo');

Route::post('user-download-debitarCredito', [UserDownloadsController::class, 'debitarCredito'])
    ->middleware('auth')
    ->name('user.downloads.debitarCredito');

    


require __DIR__ . '/auth.php';
