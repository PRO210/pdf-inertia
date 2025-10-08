<?php

namespace App\Http\Controllers;

use App\Models\UserDownload;
use Illuminate\Support\Facades\Auth;

use Illuminate\Http\Request;

class UserDownloadsController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'file_name' => 'required|string|max:255',
        ]);

        $user = Auth::user();
        $fileName = $request->input('file_name');

        $download = UserDownload::firstOrCreate(
            ['user_id' => $user->id, 'file_name' => $fileName],
            ['count' => 0]
        );

        $download->increment('count');

        return response()->json([
            'success' => true,
            'message' => 'Download contabilizado com sucesso.',
            'total_downloads' => $download->count,
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(UserDownload $UserDownload)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(UserDownload $UserDownload)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, UserDownload $UserDownload)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(UserDownload $UserDownload)
    {
        //
    }
}
