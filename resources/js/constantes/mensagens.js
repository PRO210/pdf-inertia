export const MENSAGENS_SISTEMA = {
  global: {
    manutencao: {
      id: "g_manut_01",
      titulo: "Manutenção",
      texto: "Teremos uma pausa para manutenção às 23:00.",
      tipo: "warning"
    },
    limite_downloads: {
      id: "g_limite_alcançado", // Não usamos checkbox aqui, pois é um aviso crítico
      titulo: "Limite Atingido!",
      texto: "Você atingiu o limite de downloads gratuitos. Deseja assinar o plano Pro para downloads ilimitados?",
      tipo: "error",
      botaoConfirmar: "Ver Condições",
    },
  },
  paginas: {
    "/dashboard/pdf-atividades": {
      limpar_mesa: {
        id: "p_pdf_limpar",
        texto: "Deseja limpar a mesa de atividades?",
        tipo: "confirme"
      }
    },
    "/dashboard/poster": {
      limpar_mesa: {
        id: "p_poster_limpar",
        texto: "Deseja remover as imagens do poster?",
        tipo: "confirme"
      }
    }
  }
};

