export const MENSAGENS_SISTEMA = {
  global: {
    manutencao: {
      id: "g_manut_01",
      titulo: "Manutenção",
      texto: "Teremos uma pausa para manutenção às 23:00.",
      tipo: "warning"
    }
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