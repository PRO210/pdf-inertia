import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { MENSAGENS_SISTEMA } from '../constantes/mensagens';

const MySwal = withReactContent(Swal);

export const useMensagens = () => {
  const currentPath = window.location.pathname;

  const podeExibir = (id) => {
    const silenciadas = JSON.parse(localStorage.getItem('msgs_silenciadas') || '[]');
    return !silenciadas.includes(id);
  };

  const silenciar = (id) => {
    const silenciadas = JSON.parse(localStorage.getItem('msgs_silenciadas') || '[]');
    if (!silenciadas.includes(id)) {
      const novaLista = [...silenciadas, id];
      localStorage.setItem('msgs_silenciadas', JSON.stringify(novaLista));
      console.log(`ID ${id} silenciado com sucesso.`);
    }
  };

  const getMsgLocal = (chave) => MENSAGENS_SISTEMA.paginas[currentPath]?.[chave];

  const confirmarComCheck = async (config) => {
    return MySwal.fire({
      title: 'Limpar o Preview do Pdf Atual?',
      text: config.texto,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sim, limpar tudo!',
      cancelButtonText: 'Cancelar',
      footer: `
        <div style="text-align: center;">
          <label style="display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-weight: bold; color: #444;">
            <input type="checkbox" id="dont-show-again"> Não mostrar este aviso novamente
          </label>
          <small style="display: block; margin-top: 5px; color: #444;">
            (Apenas o aviso será ocultado. Seus PDFs no histórico continuam salvos.)
          </small>
        </div>
      `,
      preConfirm: () => {
        const checkbox = MySwal.getPopup().querySelector('#dont-show-again');
        return { isChecked: checkbox ? checkbox.checked : false };
      }
    });
  };

  const exibirAvisoCritico = async (config) => {
    return MySwal.fire({
      title: config.titulo,
      text: config.texto,
      icon: 'error',
      showCancelButton: true,
      confirmButtonText: config.botaoConfirmar || 'OK',
      cancelButtonText: 'Fechar',
      confirmButtonColor: '#28a745',
    });
  };

  return { getMsgLocal, podeExibir, silenciar, confirmarComCheck, exibirAvisoCritico };
};