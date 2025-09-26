<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
  use HasFactory;


  protected $fillable = ['payment_id', 'value',  'status', 'date_created', 'date_of_expiration'];

  protected $casts = ['date_created' => 'datetime','date_of_expiration' => 'datetime' ];
}
