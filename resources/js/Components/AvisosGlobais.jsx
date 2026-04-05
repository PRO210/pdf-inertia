import { useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { MENSAGENS_SISTEMA } from '@/constantes/mensagens';
import { router } from '@inertiajs/react';

const MySwal = withReactContent(Swal);

export default function AvisosGlobais() {
  useEffect(() => {
    const aviso = MENSAGENS_SISTEMA.global.comunicado_nova_regra;
    const jaViuAviso = localStorage.getItem(aviso.id);

    if (!jaViuAviso) {
      MySwal.fire({
        title: aviso.titulo,
        html: `
          <p>${aviso.texto}</p>
          <div style="margin-top: 20px; font-size: 0.9em; color: #666;">
            <label style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <input type="checkbox" id="check-nao-mostrar" style="cursor: pointer;">
              Não mostrar este aviso novamente
            </label>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: aviso.botaoConfirmar,
        cancelButtonText: aviso.botaoSecundario,
        confirmButtonColor: '#3085d6',
        // O preConfirm permite capturar o estado do checkbox antes de fechar
        preConfirm: () => {
          const isChecked = document.getElementById('check-nao-mostrar').checked;
          return { isChecked };
        }
      }).then((result) => {
        // A lógica do checkbox: só salva no localStorage se estiver marcado
        // ou se você quiser que QUALQUER interação (confirmar/cancelar) com o check marcado desative o aviso
        const naoMostrarNovamente = document.getElementById('check-nao-mostrar')?.checked;

        if (naoMostrarNovamente) {
          localStorage.setItem(aviso.id, 'true');
        }

        // Lógica de navegação
        if (result.dismiss === Swal.DismissReason.cancel) {
          router.visit('/pagamentos');
        }
      });
    }
  }, []);

  return null;
}