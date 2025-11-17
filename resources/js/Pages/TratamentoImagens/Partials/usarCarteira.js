// resources/js/utils/wallet.js

import Swal from "sweetalert2";
import axios from "axios";

/**
 * Executa o fluxo completo de uso da wallet:
 * - Obtém saldo atual
 * - Verifica se há créditos
 * - Confirma com o usuário
 * - Debita no backend com segurança
 * - Retorna sucesso e novo saldo
 *
 * @param {Object} options
 * @param {number} options.preco - custo da operação
 * @param {string} options.fileName - nome registrado no backend
 */
export async function wallet({ preco, fileName }) {
  try {
    // 1. Obter saldo real do backend
    const respostaSaldo = await axios.get(route("user.downloads.obterSaldo"));
    const saldoAtual = respostaSaldo.data.saldo;

    if (saldoAtual < preco) {
      await Swal.fire({
        icon: "warning",
        title: "Créditos insuficientes!",
        text: `Você precisa de ${preco} créditos, mas possui apenas ${saldoAtual}.`,
      });

      return { success: false };
    }

    // 2. Confirmar a operação
    const confirmar = await Swal.fire({
      icon: "question",
      title: "Confirmar operação?",
      text: `Será descontado ${preco} crédito(s) da sua carteira.`,
      showCancelButton: true,
      confirmButtonText: "Sim",
      cancelButtonText: "Cancelar",
    });

    if (!confirmar.isConfirmed) return { success: false };

    // 3. Debitar créditos no backend
    const debito = await axios.post(route("user.downloads.debitarCredito"), {
      fileName: fileName,
      cost: preco,
    });

    // 4. Sucesso
    await Swal.fire({
      icon: "success",
      title: "Sucesso!",
      text: `Seu novo saldo é ${debito.data.new_balance}.`,
    });

    return {
      success: true,
      new_balance: debito.data.new_balance,
    };
  } catch (error) {
    console.error("Erro na função carteira:", error);

    if (error.response?.status === 403) {
      await Swal.fire({
        icon: "warning",
        title: "Créditos insuficientes!",
        text: error.response.data.message,
      });
      return { success: false };
    }

    await Swal.fire({
      icon: "error",
      title: "Erro!",
      text: "Não foi possível completar a transação.",
    });

    return { success: false };
  }
}
