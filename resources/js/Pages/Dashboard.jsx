import Footer from '@/Components/Footer';
import Pix from '@/Components/Pix';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';



export default function Dashboard() {

    const { auth } = usePage().props;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Bem-vindo ao PDF Digital Fácil!
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded">
                        {/* Grid responsiva */}
                        <div className="p-6 text-gray-900 grid grid-cols-1 md:grid-cols-2 gap-8 lg:grid-cols-3 items-center justify-center">

                            {/* Primeiro bloco */}
                            <Link
                                href={route('pdf.editor')} className="flex flex-col items-center justify-start h-full" >
                                <div className="overflow-hidden rounded shadow-md">
                                    <div className="p-4 text-justify">
                                        <p className="text-black">
                                            Se uma imagem vale mais que 1000 palavras  <strong> imagine em um lindo cartaz:) </strong> !
                                        </p>
                                    </div>
                                    <img
                                        className="px-2 transform transition-transform duration-300 hover:scale-105"
                                        src="/imagens/logo.png"
                                        alt="logo"
                                    />
                                </div>
                            </Link>

                            {/* Segundo bloco */}
                            <Link
                                href={route('pdf.atividades')} className="flex flex-col items-center justify-start h-full" >
                                <div className="overflow-hidden rounded cursor-pointer hover:shadow-lg transition">
                                    <div className="p-4 text-justify">
                                        <p className="text-black">
                                            Imagens  <strong>distribuídas de forma eficiente</strong> se tornam atividades inteligentes !
                                        </p>
                                    </div>
                                    <img
                                        className="px-2  object-contain transform transition-transform duration-300 hover:scale-105"
                                        src="/imagens/atividades.png"
                                        alt="atividades"
                                    />
                                </div>

                            </Link>

                            {/* Terceiro bloco */}

                            <Link href={route('tratamento.imagens')} className="flex flex-col items-center justify-start h-full">
                                <div className="overflow-hidden rounded cursor-pointer hover:shadow-lg transition">
                                    <div className="p-4 text-justify">
                                        <p className="text-gray-700">
                                            Envie suas imagens e escolha entre <strong>remover fundo</strong> ou <strong>aumentar qualidade</strong> usando IA.
                                        </p>
                                    </div>

                                    <img
                                        className="px-2  object-contain transform transition-transform duration-300 hover:scale-105"
                                        src="imagens/ia.png"
                                        alt="ilustração de imagem"
                                    />

                                </div>
                            </Link>

                            <div className="overflow-hidden rounded cursor-pointer hover:shadow-lg transition">
                                <div className='p-2 px-2 text-justify'>
                                    <p>Esse projeto é de cunho voluntario.
                                        Por isso não se acanhe e faça uma  doação para garantir a sua manuntenção.
                                    </p>
                                </div>
                                <img
                                    className="px-2 object-contain transform transition-transform duration-300 hover:scale-105"
                                    src="/imagens/logoCafe.svg"
                                    alt="doação"
                                />
                                <Pix />
                            </div>

                            {/* Quarto bloco */}
                            {(
                                <Link href={route('pdf.pagamentos')} className="flex flex-col items-center justify-start">
                                    <div className="overflow-hidden rounded cursor-pointer hover:shadow-lg transition">
                                        <img
                                            className="px-2 object-contain transform transition-transform duration-300 hover:scale-105"
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

            <Footer ano={2025} />
        </AuthenticatedLayout>
    );
}
