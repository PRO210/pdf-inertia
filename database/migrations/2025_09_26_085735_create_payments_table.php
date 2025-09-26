<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            // Chave Primária
            $table->id(); 

            // Assumindo que e 'user_id' é ID de outra tabela
            $table->string('preference_id',100)->unique(); // ID da preferência do MercadoPago
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Campos de Dados do Item/Transação
            $table->text('description')->nullable(); // Ex: Descrição curta do item/serviço pago
            $table->integer('quantity')->default(1); // Quantidade do item no pagamento
            $table->decimal('unit_price', 10, 2); // Preço unitário do item (total do pagamento pode ser calculado)

            // Status e Datas
            $table->string('status', 50)->default('pending'); // Ex: pending, approved, refunded
            $table->timestamp('date_created')->nullable(); // Data em que o pagamento foi registrado
            $table->timestamp('date_of_expiration')->nullable(); // Ex: Prazo para compensação ou expiração do boleto/reserva

            // Campos Padrão do Laravel
            // 'created_at' e 'updated_at'
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};