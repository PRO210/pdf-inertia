<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreditUsage extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'cost',
        'description'
    ];

    // Relacionamento com o usuário
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
