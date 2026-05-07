import { useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { router, usePage } from '@inertiajs/react';

const MySwal = withReactContent(Swal);

export default function AvisosGlobais({ alertData }) {
    const { url } = usePage();

    useEffect(() => {
        // 1. Verificação rigorosa de URL
        // Adicionamos o console.log para você ver exatamente o que o Inertia está lendo
        console.log("Rota atual detectada pelo AvisosGlobais:", url);

        const rotasDePagamento = ['/pagamentos', '/pagamento/retorno'];
        const isPaginaProtegida = rotasDePagamento.some(path => url.startsWith(path));

        // Se estiver em uma página de pagamento, mata a execução do useEffect IMEDIATAMENTE
        if (isPaginaProtegida) {
            return; 
        }

        // 2. Verificação de dados do alerta
        if (!alertData || !alertData.showAlert) return;

        const storageKey = `hide_alert_${alertData.id}`;
        const isDismissed = localStorage.getItem(storageKey);

        if (!isDismissed) {
            MySwal.fire({
                title: alertData.type === 'expiration' ? '⚠️ Assinatura' : '🚀 Limite',
                html: `
                    <p>${alertData.message}</p>
                    <div style="margin-top: 20px; font-size: 0.85em; color: #666;">
                        <label style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <input type="checkbox" id="check-na-marcar" style="cursor: pointer;">
                            Não me avisar novamente hoje
                        </label>
                    </div>
                `,
                icon: alertData.type === 'expiration' ? 'warning' : 'info',
                showCancelButton: true,
                confirmButtonText: 'Ver Planos',
                cancelButtonText: 'Depois',
                confirmButtonColor: '#4f46e5',
                preConfirm: () => {
                    const cb = document.getElementById('check-na-marcar');
                    return { isChecked: cb ? cb.checked : false };
                }
            }).then((result) => {
                if (result.value?.isChecked) {
                    localStorage.setItem(storageKey, 'true');
                }

                if (result.isConfirmed) {
                    // Importante: use o nome da rota exato do seu web.php
                    router.visit('/pagamentos'); 
                }
            });
        }
    }, [url, alertData]); // O monitoramento da 'url' é o que impede o travamento

    return null;
}