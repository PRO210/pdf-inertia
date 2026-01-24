import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Footer from '@/Components/Footer';
import { Stage, Layer, Image as KonvaImage, Line, Rect } from 'react-konva';
import { wallet } from '@/Services/Carteira';
import { downloadCount } from '@/Services/DownloadsCount';
import { ImageUpscalePicaJs } from '@/Services/ImageUpscalePicaJs';


export default function TratamentoImagens() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [brushSize, setBrushSize] = useState(25);
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskPreviewUrl, setMaskPreviewUrl] = useState(null);

  const stageRef = useRef();
  const [konvaImage, setKonvaImage] = useState(null);
  
  const realDimensions = useRef({ width: 0, height: 0 });

  // const STAGE_SIZE = 500; // Tamanho fixo para garantir sincronia entre foto e máscara

  // Calcule a proporção
  // Define uma largura padrão de 500px para a interface
  const stageWidth = 500;

  // Se já tivermos as dimensões reais, calculamos a altura proporcional
  // Caso contrário, usamos 500 como padrão inicial
  const stageHeight = realDimensions.current.width > 0
    ? (stageWidth * (realDimensions.current.height / realDimensions.current.width))
    : 500;


  const MODELS = {
    BRIA_ERASE_MODEL_PRICE: 0.33,
  };


  const downloadResult = async () => {
    if (!result) return;

    setLoading(true); // Opcional: mostrar loading durante o upscale
    try {
      // 1. Carrega o resultado da IA (500px) em um ImageBitmap ou Image
      const response = await fetch(result);
      const blobIA = await response.blob();
      const imgBitmap = await createImageBitmap(blobIA);

      // 2. Chama sua função "Pica" passando o tamanho original guardado
      const { width, height } = realDimensions.current;

      // Ajuste: passamos a imagem da IA e os tamanhos originais
      const imagemAltaRes = await ImageUpscalePicaJs.ajustarImagemPica(
        imgBitmap,
        width,
        height
      );

      // 3. Executa o download da versão em alta resolução
      const link = document.createElement('a');
      link.href = imagemAltaRes.base64; // Usando o base64 retornado pela sua função
      link.download = `resultado-alta-res-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log de contabilização (mantenha sua lógica original aqui)
      await downloadCount('bria-eraser-remover-objetos');

    } catch (error) {
      console.error("Erro no upscale/download:", error);
      Swal.fire('Erro', 'Não foi possível processar a imagem em alta resolução.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Carregar Imagem no Canvas ---------------- */
  useEffect(() => {
    if (!imagePreview) return;
    const img = new window.Image();
    img.src = imagePreview;
    img.onload = () => setKonvaImage(img);
  }, [imagePreview]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // 1. Armazena o tamanho original para o Pica usar no download
      realDimensions.current = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };

      // 2. Define a imagem para o Konva e o Preview
      setImage(file);
      setImagePreview(url);

      // 3. Reseta os estados de edição para a nova imagem
      setLines([]);
      setMaskPreviewUrl(null);
      setResult(null); // Limpa o resultado anterior se houver
    };

    img.src = url;
  };

  /* ---------------- Lógica de Desenho ---------------- */
  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { points: [pos.x, pos.y], size: brushSize }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    setLines([...lines.slice(0, -1), lastLine]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    updateMaskPreview();
  };

  /* ---------------- Geração de Máscara e Preview ---------------- */
  const updateMaskPreview = async () => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const maskLayer = stage.findOne('#mask-layer');
    const photoLayer = stage.findOne('#photo-layer');

    // Esconde a foto para capturar apenas o desenho
    photoLayer.hide();

    // Adiciona fundo preto temporário
    const bg = new window.Konva.Rect({
      width: stageWidth,
      height: stageHeight,
      fill: 'black',
    });
    maskLayer.add(bg);
    bg.moveToBottom();

    // Seta as linhas para opacidade total (branco puro)
    const linesNodes = maskLayer.find('Line');
    linesNodes.forEach(line => line.opacity(1));

    const dataUrl = maskLayer.toDataURL({ pixelRatio: 1 });
    setMaskPreviewUrl(dataUrl);

    // Restaura o estado para o usuário continuar vendo
    bg.destroy();
    linesNodes.forEach(line => line.opacity(0.5));
    photoLayer.show();
  };

  /* ---------------- Envio para API ---------------- */
  const processImage = async () => {
    if (!lines.length) return Swal.fire('Atenção', 'Desenhe sobre o objeto.', 'warning');

    setLoading(true);
    try {
      const usarCarteira = await wallet({ preco: MODELS.BRIA_ERASE_MODEL_PRICE, fileName: 'bria-eraser' });
      if (!usarCarteira.success) return;

      const stage = stageRef.current;

      // 1. Gerar a Máscara (Preto e Branco)
      const maskDataUrl = maskPreviewUrl;
      const maskRes = await fetch(maskDataUrl);
      const maskBlob = await maskRes.blob();

      // 2. Gerar a Foto (Redimensionada para o mesmo tamanho do Stage)
      const photoLayer = stage.findOne('#photo-layer');
      const photoDataUrl = photoLayer.toDataURL({ pixelRatio: 1 });
      const photoRes = await fetch(photoDataUrl);
      const finalImageBlob = await photoRes.blob();

      const formData = new FormData();
      formData.append('image', finalImageBlob, 'image.png');
      formData.append('mask', maskBlob, 'mask.png');

      const res = await axios.post(route('bria-eraser.remover.objetos'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(res.data.output_base64_or_url);
      Swal.fire('Sucesso!', 'Objeto removido.', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Erro', 'Falha ao processar imagem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Remover Objetos" />
      <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen shadow-xl rounded-xl">

        <div className="text-center mb-8">
          <h1 className="mt-4 text-3xl font-bold text-gray-800">
            O que você deseja remover hoje?
          </h1>
          <p className="text-gray-500">Pinte sobre pessoas ou objetos para removê-los sem deixar vestígios.</p>
        </div>

        <div className="mb-8 text-center">
          <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700" onChange={handleUpload} />
        </div>

        {imagePreview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-items-center">

            {/* CANVAS PRINCIPAL */}
            <div className="flex flex-col items-center">
              <p className="mb-2 font-semibold">Pinte o objeto que deseja 🧹 remover:</p>

              <Stage
                width={stageWidth}
                height={stageHeight}
                ref={stageRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="border-4 border-gray-200 rounded-lg overflow-hidden bg-gray-100"
              >
                <Layer id="photo-layer">
                  {konvaImage && <KonvaImage image={konvaImage} width={stageWidth} height={stageHeight} />}
                </Layer>
                <Layer id="mask-layer">
                  {lines.map((line, i) => (
                    <Line
                      key={i}
                      points={line.points}
                      stroke="white"
                      strokeWidth={line.size}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      opacity={0.5}
                    />
                  ))}
                </Layer>
              </Stage>

              <div className="mt-4 flex gap-4 items-center">
                <span>Tamanho do Pincel:</span>
                <input type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} />
              </div>
            </div>

            {/* PREVIEW DA MÁSCARA */}
            <div className="flex flex-col items-center">
              <p className="mb-2 font-semibold">O que a IA vai enxergar:</p>
              <div className="w-[300px] h-[300px] bg-black border-4 border-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                {maskPreviewUrl ? (
                  <img src={maskPreviewUrl} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-gray-500 text-xs text-center p-4">A máscara P&B aparecerá aqui</span>
                )}
              </div>

              <button
                onClick={processImage}
                disabled={loading}
                className={`mt-10 px-10 py-4 rounded-full font-bold text-white transition ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 shadow-lg'}`}
              >
                {loading ? 'Processando...' : 'REMOVER OBJETOS AGORA'}
              </button>
            </div>

          </div>
        )}

        {result && (
          <div className="mt-10 text-center border-t border-gray-200 pt-10 pb-20">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Resultado Final</h2>

            <div className="relative inline-block group">
              <img
                src={result}
                className="max-w-full md:max-w-2xl mx-auto rounded-lg shadow-2xl border-4 border-white"
                alt="Resultado da IA"
              />

              {/* Overlay de botões sobre a imagem ao passar o mouse ou visível abaixo em mobile */}
              <div className="mt-6 flex gap-4 justify-center">
                <button
                  onClick={downloadResult}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="Status-download" />
                  </svg>
                  BAIXAR IMAGEM
                </button>

                <button
                  onClick={() => {
                    setResult(null);
                    setLines([]);
                    setMaskPreviewUrl(null);
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition"
                >
                  NOVA EDIÇÃO
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <Footer ano={2026} />
    </AuthenticatedLayout>
  );
}