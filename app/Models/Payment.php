<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
  use HasFactory;


  protected $fillable = ['id', 'preference_id', 'user_id', 'description', 'quantity', 'unit_price', 'status', 'date_created', 'date_of_expiration'];

  protected $casts = ['date_created' => 'datetime', 'date_of_expiration' => 'datetime'];

  public function user()
  {
    return $this->belongsTo(User::class);
  }
}
