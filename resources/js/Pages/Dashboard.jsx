import Footer from '@/Components/Footer';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';



export default function Dashboard() {

    const { auth } = usePage().props;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Bem-vindo ao Pôster Digital Fácil!
                </h2>
            }
        >
            <Head title="Dashboard" />

            

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">

                        {/* Grid responsiva */}
                        <div className="p-6 text-gray-900 grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Primeiro bloco */}
                            <Link
                                href={route('pdf.editor')}
                                className="rounded-md px-3 py-2 text-black ring-1 ring-transparent transition hover:text-black/70 
          focus:outline-none focus-visible:ring-[#FF2D20] dark:text-white dark:hover:text-white/80 
          dark:focus-visible:ring-white flex justify-center"
                            >
                                <div className="overflow-hidden rounded-xl shadow-md">
                                    <img
                                        className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl object-contain 
              transform transition-transform duration-300 hover:scale-105"
                                        src="/imagens/logo.png"
                                        alt="logo"
                                    />
                                </div>
                            </Link>

                            {/* Segundo bloco */}
                            <Link
                                href={route('pdf.atividades')}
                                className="rounded-md px-3 py-2 text-black ring-1 ring-transparent transition hover:text-black/70 
          focus:outline-none focus-visible:ring-[#FF2D20] dark:text-white dark:hover:text-white/80 
          dark:focus-visible:ring-white flex justify-center"
                            >
                                <div className="overflow-hidden rounded-xl shadow-md">
                                    <img
                                        className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl object-contain 
              transform transition-transform duration-300 hover:scale-105"
                                        src="/imagens/atividades.png"
                                        alt="atividades"
                                    />
                                </div>
                            </Link>


                            {/* Terceiro bloco */}

                            {auth.user.id === 1 && (
                                <Link
                                    href={route('pdf.pagamentos')}
                                    className="rounded-md px-3 py-2 text-black ring-1 ring-transparent transition hover:text-black/70 
          focus:outline-none focus-visible:ring-[#FF2D20] dark:text-white dark:hover:text-white/80 
          dark:focus-visible:ring-white flex justify-center"
                                >
                                    <div className="overflow-hidden rounded-xl shadow-md">
                                        <img
                                            className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl object-contain 
              transform transition-transform duration-300 hover:scale-105"
                                            src="/imagens/Logos Mercado Pago 2025--fb6f16c9/Logos Mercado Pago 2025/Uso digital - RGB/PNGs/MP_RGB_HANDSHAKE_color_horizontal.png"
                                            alt="pagamentos"
                                        />
                                    </div>
                                </Link>
                            )}

                         
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </AuthenticatedLayout>
    );
}
