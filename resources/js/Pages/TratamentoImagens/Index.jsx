import { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function TratamentoImagens() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // URL da imagem antes
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setImagePreview(URL.createObjectURL(file)); // cria a URL da imagem
    setResult(null); // reseta o resultado anterior
  };

  const processImage = async (endpoint) => {
    if (!image) return Swal.fire('Selecione uma imagem primeiro!');
    setLoading(true);

    const formData = new FormData();
    formData.append('image', image);

    try {
      const res = await axios.post(endpoint, formData);
      const outputUrl = res.data?.output?.[0];
      if (outputUrl) setResult(outputUrl);
      else Swal.fire('Aguardando processamento no Replicate...');
    } catch (err) {
      console.error(err);
      Swal.fire('Erro ao processar imagem', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">🪄 Tratamento de Imagens com IA</h2>

      <input type="file" accept="image/*" onChange={handleUpload} />
      
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => processImage('/imagens/remover-fundo')}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg"
        >
          Remover Fundo
        </button>

        <button
          onClick={() => processImage('/imagens/aumentar-qualidade')}
          className="bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          Aumentar Qualidade
        </button>
      </div>

      {loading && <p>⏳ Processando imagem...</p>}

      {imagePreview && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Preview:</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Antes */}
            <div className="flex-1 text-center">
              <p className="font-medium mb-1">Antes</p>
              <img
                src={imagePreview}
                alt="Antes"
                className="max-w-full rounded-xl shadow-md"
              />
            </div>

            {/* Depois */}
            {result && (
              <div className="flex-1 text-center">
                <p className="font-medium mb-1">Depois</p>
                <img
                  src={result}
                  alt="Depois"
                  className="max-w-full rounded-xl shadow-md"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
