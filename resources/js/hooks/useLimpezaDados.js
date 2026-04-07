import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export const useLimpezaDados = () => {

  const limparHistoricoPdfs = async (pdfs, setPdfs, setPdfUrl) => {
    const isSilenciado = localStorage.getItem('silenciar_aviso_limpeza') === 'true';

    const executarLimpeza = () => {
      if (Array.isArray(pdfs)) {
        pdfs.forEach(pdf => {
          if (pdf.url) URL.revokeObjectURL(pdf.url);
        });
      }
      setPdfs([]);
      if (setPdfUrl) setPdfUrl(null);
    };

    if (isSilenciado) {
      executarLimpeza();
      return;
    }

    const result = await MySwal.fire({
      title: 'Limpar Histórico?',
      icon: 'warning',
      html: `
        <p>Isso removerá todas as atividades salvas nesta sessão.</p>
        <div style="margin-top: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <input type="checkbox" id="swal-checkbox-silenciar" style="cursor: pointer;">
          <label for="swal-checkbox-silenciar" style="cursor: pointer; font-size: 14px; color: #666; user-select: none;">
            Não mostrar novamente
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, limpar tudo!',
      cancelButtonText: 'Cancelar',
    });


    if (result.isConfirmed) {

      const checkbox = document.getElementById('swal-checkbox-silenciar');
      const silenciar = checkbox ? checkbox.checked : false;

      if (silenciar) {
        localStorage.setItem('silenciar_aviso_limpeza', 'true');
      }

      executarLimpeza();

      MySwal.fire({
        toast: true,
        position: 'top',
        icon: 'success',
        title: 'Histórico limpo!',
        showConfirmButton: false,
        timer: 2000
      });
    }

  };


  // Mantive sua função de reset de configs que você enviou
  const resetarConfiguracoesGeral = async (callbackReset, storageKeys = []) => {
    const result = await MySwal.fire({
      title: 'Resetar Configurações?',
      text: "Deseja voltar ao padrão? Você pode optar por limpar as preferências salvas também.",
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Sim, resetar tudo',
      denyButtonText: 'Resetar e Limpar Cache',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed || result.isDenied) {
      callbackReset();
      if (result.isDenied) {
        storageKeys.forEach(key => localStorage.removeItem(key));
      }
      // MySwal.fire();
      MySwal.fire({
        toast: true,
        position: 'top',
        titleText: 'Pronto! Configurações resetadas.',
        timer: 2000,
        showConfirmButton: false,

      });
    }
  };

  return { limparHistoricoPdfs, resetarConfiguracoesGeral };
};