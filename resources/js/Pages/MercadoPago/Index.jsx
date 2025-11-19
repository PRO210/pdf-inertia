import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Footer from '@/Components/Footer'
import Mp from './Partials/Mp';


export default function MercadoPago() {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Checkout de Pagamento/Créditos com Mercado Pago
                </h2>
            }
        >
            <Head title="Pagamento/Créditos" />

            <div className="py-8 min-h-svh">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8">
                        <Mp />
                    </div>
                </div>
            </div>
            <Footer ano={2025} />
        </AuthenticatedLayout>

    );

}
