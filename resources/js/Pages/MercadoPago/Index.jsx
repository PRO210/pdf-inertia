import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Footer from '@/Components/Footer'
import Mp from './Partials/Mp';


export default function MercadoPago() {
    return (
        <>
            {/* O Head define o título da aba do navegador para esta página específica */}
            <Head title="Pagamento/Créditos" />

            <div className="py-8 min-h-svh">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8">
                        <Mp />
                    </div>
                </div>
            </div>
        </>
    );
}

/**
 * Aqui definimos o layout para o Inertia — o layout NÃO será desmontado entre navegações.
 * Repare que passamos o header (que era usado anteriormente) para o AuthenticatedLayout.
 */
MercadoPago.layout = page => (
    <AuthenticatedLayout
        auth={page.props.auth}
        header={
            <>
                <h1 className="text-xl font-semibold text-gray-800">Checkout de Pagamento/Créditos!</h1>
                <h2 className="text-sm font-medium text-gray-500">Checkout de Pagamento/Créditos...</h2>
            </>
        }
    >
        {page}
        <Footer ano={2025} />
    </AuthenticatedLayout>
);
