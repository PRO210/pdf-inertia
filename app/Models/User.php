<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];


    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function creditUsages()
    {
        return $this->hasMany(CreditUsage::class);
    }

    /**
     * Calcula o saldo total de créditos do usuário.
     * Use $user->credit_balance
     * @return float
     */
    public function getCreditBalanceAttribute(): float
    {
        // Certifique-se de que a soma dos payments (entradas) está correta
        $totalCredits = $this->payments()->where('status', 'approved')->sum('quantity');

        // Soma de todos os usos (débitos)
        $totalDebits = $this->creditUsages()->sum('cost');

        return $totalCredits - $totalDebits;
    }
}
