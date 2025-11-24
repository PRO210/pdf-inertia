import Footer from '@/Components/Footer';
import { Head, Link } from '@inertiajs/react';


export default function Welcome({ auth, laravelVersion, phpVersion }) {
    const handleImageError = () => {
        document
            .getElementById('screenshot-container')
            ?.classList.add('!hidden');
        document.getElementById('docs-card')?.classList.add('!row-span-1');
        document
            .getElementById('docs-card-content')
            ?.classList.add('!flex-row');
        document.getElementById('background')?.classList.add('!hidden');
    };


    return (
        <>
            <Head title="Bem vindo!" />
            <div className="bg-gray-50 text-black/50 dark:bg-black dark:text-white/50">
                <div className="relative flex min-h-screen flex-col items-center justify-center selection:bg-[#FF2D20] selection:text-white">
                    <div className="relative w-full max-w-2xl px-6 lg:max-w-7xl">
                        <header className="grid grid-cols-2 items-center gap-2 py-10 lg:grid-cols-3">
                            <div className="flex lg:col-start-2 lg:justify-center">

                                {auth.user ? (
                                    <Link href={route('dashboard')}>
                                        <div className="flex lg:col-start-2 lg:justify-center">
                                            <img className="text-white lg:h-16 lg:text-[#FF2D20] rounded" src="/imagens/logo.png" alt="Logo" />
                                        </div>
                                    </Link>
                                ) : (
                                    <img className="h-12 w-auto text-white lg:h-16 lg:text-[#FF2D20] rounded" src="/imagens/logo.png" alt="Logo" />

                                )}
                            </div>
                            <nav className="-mx-3 flex flex-1 justify-end">
                                {auth.user ? (
                                    ''
                                ) : (
                                    <>
                                        <Link
                                            href={route('login')}
                                            className="font-bold rounded-md px-3 py-2 text-black ring-1 ring-transparent transition hover:text-black/70 focus:outline-none focus-visible:ring-[#FF2D20] dark:text-white dark:hover:text-white/80 dark:focus-visible:ring-white"
                                        >
                                            Login
                                        </Link>
                                        <Link
                                            href={route('register')}
                                            className=" font-bold rounded-md px-3 py-2 text-black ring-1 ring-transparent transition hover:text-black/70 focus:outline-none focus-visible:ring-[#FF2D20] dark:text-white dark:hover:text-white/80 dark:focus-visible:ring-white"
                                        >
                                            Registro
                                        </Link>
                                    </>
                                )}
                            </nav>
                        </header>

                        <main className="mt-6">
                            <div className="w-full min-h-screen bg-gray-50 dark:bg-zinc-950 px-4 sm:px-6 lg:px-8 py-10">
                                <div className="grid grid-cols-1 flex-col-2 sm:grid-cols-2  gap-8 items-stretch">
                                    {/* Primeiro link */}
                                    <a
                                        href="#"
                                        id="docs-card"
                                        className="flex flex-col gap-6 overflow-hidden rounded-lg bg-white p-6 shadow-[0px_14px_34px_0px_rgba(0,0,0,0.08)] ring-1 ring-white/[0.05] transition duration-300 hover:text-black/70 hover:ring-black/20 focus:outline-none focus-visible:ring-[#FF2D20] lg:p-10 lg:pb-10 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:text-white/70 dark:hover:ring-zinc-700 dark:focus-visible:ring-[#FF2D20]"
                                    >
                                        <div className="relative flex items-center gap-6 lg:items-end">
                                            <div id="docs-card-content" className="flex items-start gap-6 flex-col">
                                                <div className="sm:pt-5 lg:pt-0">
                                                    <div className="flex items-center justify-around">
                                                        <div>
                                                            <svg className="size-5 sm:size-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <path
                                                                    fill="#FF2D20"
                                                                    d="M23 4a1 1 0 0 0-1.447-.894L12.224 7.77a.5.5 0 0 1-.448 0L2.447 3.106A1 1 0 0 0 1 4v13.382a1.99 1.99 0 0 0 1.105 1.79l9.448 4.728c.14.065.293.1.447.1.154-.005.306-.04.447-.105l9.453-4.724a1.99 1.99 0 0 0 1.1-1.789V4ZM3 6.023a.25.25 0 0 1 .362-.223l7.5 3.75a.251.251 0 0 1 .138.223v11.2a.25.25 0 0 1-.362.224l-7.5-3.75a.25.25 0 0 1-.138-.22V6.023Zm18 11.2a.25.25 0 0 1-.138.224l-7.5 3.75a.249.249 0 0 1-.329-.099.249.249 0 0 1-.033-.12V9.772a.251.251 0 0 1 .138-.224l7.5-3.75a.25.25 0 0 1 .362.224v11.2Z"
                                                                />
                                                                <path
                                                                    fill="#FF2D20"
                                                                    d="m3.55 1.893 8 4.048a1.008 1.008 0 0 0 .9 0l8-4.048a1 1 0 0 0-.9-1.785l-7.322 3.706a.506.506 0 0 1-.452 0L4.454.108a1 1 0 0 0-.9 1.785H3.55Z"
                                                                />
                                                            </svg>
                                                        </div>
                                                        <h2 className="text-4xl font-semibold text-black dark:text-white">Motivação</h2>
                                                        <div></div>
                                                    </div>

                                                    <p className="mt-4 text-2xl/relaxed text-justify">
                                                        Nosso app transforma sua imagem em um pôster ampliado em PDF, pronto para impressão. É simples de usar,
                                                        não precisa instalar, pois roda direto do navegador, em qualquer dispositivo. Ideal para quem deseja
                                                        criar pôsteres grandes sem complicação: basta fazer login e pronto! 🙂
                                                    </p>
                                                    <p className="mt-4 text-2xl/relaxed text-justify">
                                                        Também é possível fazer o inverso: usar suas imagens para montar um mosaico com a mesma facilidade! 🙂
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </a>

                                    {/* Segundo link */}
                                    <a
                                        href="#"
                                        className="flex flex-col gap-6 rounded-lg bg-white p-6 shadow-[0px_14px_34px_0px_rgba(0,0,0,0.08)] ring-1 ring-white/[0.05] transition duration-300 hover:text-black/70 hover:ring-black/20 focus:outline-none focus-visible:ring-[#FF2D20] lg:p-10 lg:pb-10 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:text-white/70 dark:hover:ring-zinc-700 dark:focus-visible:ring-[#FF2D20]"
                                    >
                                        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#FF2D20]/10 sm:size-16">
                                            <svg className="size-5 sm:size-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <g fill="#FF2D20">
                                                    <path d="M24 8.25a.5.5 0 0 0-.5-.5H.5a.5.5 0 0 0-.5.5v12a2.5 2.5 0 0 0 2.5 2.5h19a2.5 2.5 0 0 0 2.5-2.5v-12Zm-7.765 5.868a1.221 1.221 0 0 1 0 2.264l-6.626 2.776A1.153 1.153 0 0 1 8 18.123v-5.746a1.151 1.151 0 0 1 1.609-1.035l6.626 2.776ZM19.564 1.677a.25.25 0 0 0-.177-.427H15.6a.106.106 0 0 0-.072.03l-4.54 4.543a.25.25 0 0 0 .177.427h3.783c.027 0 .054-.01.073-.03l4.543-4.543ZM22.071 1.318a.047.047 0 0 0-.045.013l-4.492 4.492a.249.249 0 0 0 .038.385.25.25 0 0 0 .14.042h5.784a.5.5 0 0 0 .5-.5v-2a2.5 2.5 0 0 0-1.925-2.432ZM13.014 1.677a.25.25 0 0 0-.178-.427H9.101a.106.106 0 0 0-.073.03l-4.54 4.543a.25.25 0 0 0 .177.427H8.4a.106.106 0 0 0 .073-.03l4.54-4.543ZM6.513 1.677a.25.25 0 0 0-.177-.427H2.5A2.5 2.5 0 0 0 0 3.75v2a.5.5 0 0 0 .5.5h1.4a.106.106 0 0 0 .073-.03l4.54-4.543Z" />
                                                </g>
                                            </svg>
                                        </div>

                                        <div className="pt-3 sm:pt-5">
                                            <img className="w-full object-contain" src="/imagens/Pôster Digital Fácil.png" alt="Pôster" />
                                        </div>
                                    </a>
                                </div>
                            </div>

                            {/* <div className="xs: bg-blue-700  sm:bg-gray-500  md:bg-red-600  lg:bg-yellow-500 xl:bg-green-500 h-6 mx-8"></div> */}

                            {/* Terceiro bloco */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 items-stretch gap-8">

                                <Link href={route('pdf.editor')} className="flex flex-col items-center justify-start">
                                    <div className="overflow-hidden rounded shadow-md bg-[#FF2D20]/10 hover:shadow-lg transition pb-6">
                                        <div className="p-4 text-xl text-center">
                                            <p className="font-semibold text-black dark:text-white">
                                                <strong>Vamos começar: Escolha entre um dos nossos serviços e aproveite</strong>!
                                            </p>
                                        </div>
                                        <img
                                            className="px-2 transform transition-transform duration-300 hover:scale-105"
                                            src="/imagens/poster.png"
                                            alt="poster"
                                        />
                                    </div>
                                </Link>

                                <Link href={route('pdf.atividades')} className="flex flex-col items-center justify-start">
                                    <div className="overflow-hidden rounded hover:shadow-md bg-[#FF2D20]/10 transition pb-6">
                                        <div className="p-4 text-xl text-center">
                                            <p className="font-semibold text-black dark:text-white">
                                                Imagens <strong>distribuídas de forma eficiente</strong> se tornam atividades inteligentes!
                                            </p>
                                        </div>
                                        <img
                                            className="px-2 max-h-36 m-auto object-contain transform transition-transform duration-300 hover:scale-105"
                                            src="/imagens/atividades.png"
                                            alt="atividades"
                                        />
                                    </div>
                                </Link>

                                <Link href={route('tratamento.imagens')} className="flex flex-col items-center justify-start h-full">
                                    <div className="overflow-hidden rounded shadow-md bg-[#FF2D20]/10 hover:shadow-lg transition pb-6">
                                        <div className="p-4 text-xl text-center">
                                            <p className="font-semibold text-black dark:text-white">
                                                Escolha entre <strong>remover fundo</strong> ou <strong>aumentar qualidade</strong> usando IA.
                                            </p>
                                        </div>
                                        <img
                                            className="px-2 max-h-36 m-auto object-contain transform transition-transform duration-300 hover:scale-105"
                                            src="imagens/ia.png"
                                            alt="ilustração de imagem"
                                        />
                                    </div>
                                </Link>

                                <Link href={route('imagem-to-anime.create')} className="flex flex-col items-center justify-start h-full">
                                    <div className="overflow-hidden rounded shadow-md bg-[#FF2D20]/10 hover:shadow-lg transition pb-6">
                                        <div className="p-4 text-xl text-center">
                                            <p className="font-semibold text-black dark:text-white">
                                              Crie avatares, perfis ou artes personalizadas no universo anime.
                                            </p>
                                        </div>
                                        <img
                                            className="px-2 max-h-36 m-auto object-contain transform transition-transform duration-300 hover:scale-105"
                                            src="imagens/imagem-to-anime.png"
                                            alt="ilustração de imagem"
                                        />
                                    </div>
                                </Link>

                            </div>

                        </main>
                    </div>
                </div>
                <Footer ano={2025} />
            </div>
        </>
    );
}
