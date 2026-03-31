import { useState, useEffect } from "react";

export function useLocalStorage(key, valorInicial) {
  const [valor, setValor] = useState(() => {
    try {
      const itemSalvo = localStorage.getItem(key);
      return itemSalvo ? JSON.parse(itemSalvo) : valorInicial;
    } catch (error) {
      console.error("Erro ao ler localStorage:", error);
      return valorInicial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(valor));
    } catch (error) {
      console.error("Erro ao salvar no localStorage:", error);
    }
  }, [key, valor]);

  return [valor, setValor];
}