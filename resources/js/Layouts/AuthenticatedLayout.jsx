import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="border-b border-gray-100 bg-white">
                <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex shrink-0 items-center">
                                <Link href="/">
                                    <ApplicationLogo className="block fill-current text-gray-800" />
                                </Link>
                            </div>
                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex  ">
                                <NavLink href={route('dashboard')} active={route().current('dashboard')} >
                                    Dashboard
                                </NavLink>

                                <NavLink href={route('pdf.editor')} active={route().current('pdf.editor')} >
                                    Criar Posters
                                </NavLink>

                                <NavLink href={route('pdf.atividades')} active={route().current('pdf.atividades')} >
                                    Criar Atividades
                                </NavLink>


                                <div className="hidden sm:flex sm:items-center sm:ms-6">

                                    <div className="ms-3 relative group">
                                        <Dropdown>
                                            <Dropdown.Trigger>
                                                <button
                                                    type="button"
                                                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full transition duration-300 ease-in-out
                        ${route().current('tratamento.*')
                                                            ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                                                            : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <span className="mr-1">✨ Ferramentas de IA</span>
                                                    <svg className="ms-1 h-4 w-4 transition-transform duration-300 group-hover:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </Dropdown.Trigger>

                                            <div className="absolute z-50 hidden group-hover:block pt-2 w-56">
                                                <div className="rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 bg-white overflow-hidden border border-indigo-50">
                                                    <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-semibold bg-gray-50">
                                                        Processamento de Imagem
                                                    </div>

                                                    <Dropdown.Link
                                                        href={route('tratamento.imagens')}
                                                        className="flex items-center space-x-2 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        <span>📸</span>
                                                        <span>Melhoramento de Imagens</span>
                                                    </Dropdown.Link>

                                                    <Dropdown.Link href={route('remover.objetos')} className="pro-navigator" >
                                                        <span>🧹</span>
                                                        <span>Remover Objeto</span>
                                                    </Dropdown.Link>

                                                    <Dropdown.Link href={route('imagem-to-anime.create')} className="pro-navigator" >
                                                        <span> 👨 Imagem para Anime 🥷</span>
                                                    </Dropdown.Link>

                                                </div>
                                            </div>
                                        </Dropdown>
                                    </div>
                                </div>


                                <NavLink href={route('image.in.mask')} active={route().current('image.in.mask')} >
                                    Imagem em Formas
                                </NavLink>

                                <NavLink href={route('pagamento.retorno')} active={route().current('pagamento.retorno')} >
                                    Carteira
                                </NavLink>

                                {user.id === 1 && (
                                    <div className="hidden sm:flex sm:items-center sm:ms-6">
                                        <div className="ms-3 relative group">
                                            <Dropdown>
                                                <Dropdown.Trigger>
                                                    <button
                                                        type="button"
                                                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full transition duration-300 ease-in-out
                        ${route().current('tratamento.*')
                                                                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                                                                : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span className="mr-1">🛡️ Usuários</span>
                                                        <svg className="ms-1 h-4 w-4 transition-transform duration-300 group-hover:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </Dropdown.Trigger>

                                                <div className="absolute z-50 hidden group-hover:block pt-2 w-56">
                                                    <div className="rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 bg-white overflow-hidden border border-indigo-50">
                                                        {/* <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-semibold bg-gray-50">
                                                        Processamento de Imagem
                                                    </div> */}

                                                        <Dropdown.Link
                                                            href={route('users.index')}
                                                            className="flex items-center space-x-2 hover:bg-indigo-50 transition-colors"
                                                        >
                                                            <span>📋</span>
                                                            <span>Usuários</span>
                                                        </Dropdown.Link>

                                                        <Dropdown.Link
                                                            href={route('downloads.index')}
                                                            className="flex items-center space-x-2 hover:bg-indigo-50 transition-colors"
                                                        >
                                                            <span>📊</span>
                                                            <span>Downloads</span>
                                                        </Dropdown.Link>

                                                    </div>
                                                </div>

                                            </Dropdown>
                                        </div>
                                    </div>
                                )}
                               
                            </div>
                        </div>

                        <div className="hidden sm:ms-6 sm:flex sm:items-center">
                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none"
                                            >
                                                {user.name}

                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link
                                            href={route('profile.edit')}
                                        >
                                            Perfil
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                        >
                                            Sair
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-500 focus:bg-gray-100 focus:text-gray-500 focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Parte Mobil */}
                <div
                    className={
                        (showingNavigationDropdown ? 'block' : 'hidden') +
                        ' sm:hidden'
                    }
                >
                    <div className="space-y-1 pb-3 pt-2">
                        <ResponsiveNavLink
                            href={route('dashboard')}
                            active={route().current('dashboard')}
                        >
                            Dashboard
                        </ResponsiveNavLink>
                    </div>

                    <div className="border-t border-gray-200 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-gray-800">
                                {user.name}
                            </div>
                            <div className="text-sm font-medium text-gray-500">
                                {user.email}
                            </div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>Perfil</ResponsiveNavLink>
                            <ResponsiveNavLink href={route('pagamento.retorno')}>Carteira</ResponsiveNavLink>
                            {user.id === 1 && (
                                <ResponsiveNavLink href={route('users.index')}>Usuários</ResponsiveNavLink>
                            )}
                            <ResponsiveNavLink
                                method="post"
                                href={route('logout')}
                                as="button"
                            >
                                Sair
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>

            </nav>

            {header && (
                <header className="bg-white shadow">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main className='flex-1'>{children}</main>
        </div>
    );
}
