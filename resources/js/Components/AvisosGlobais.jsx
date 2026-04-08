
import { useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { router } from '@inertiajs/react';

const MySwal = withReactContent(Swal);


export default function AvisosGlobais({ alertData }) {
  useEffect(() => {
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
                            Não me avisar novamente sobre isso hoje
                        </label>
                    </div>
                `,
        icon: alertData.type === 'expiration' ? 'warning' : 'info',
        showCancelButton: true,
        confirmButtonText: 'Ver Planos',
        cancelButtonText: 'Depois',
        confirmButtonColor: '#4f46e5',
        // O segredo: Capturamos o estado ANTES do modal fechar
        preConfirm: () => {
          return {
            isChecked: document.getElementById('check-na-marcar').checked
          };
        }
      }).then((result) => {
        // Se o usuário clicou em "Depois", o result.value costuma ser undefined no SweetAlert padrão
        // Então buscamos o valor diretamente do DOM antes dele sumir completamente ou via lógica de fechamento
        const checkbox = document.getElementById('check-na-marcar');
        const wasChecked = checkbox ? checkbox.checked : result.value?.isChecked;

        if (wasChecked) {
          localStorage.setItem(storageKey, 'true');
        }

        if (result.isConfirmed) {
          router.visit(route('pagamento.retorno'));
        }
      });
    }
  }, [alertData]);

  return null;
}