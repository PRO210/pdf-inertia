export default function Spinner() {
  const [carregando, setCarregando] = useState(true);

  return (
    <div className="relative w-64 h-64">
      {carregando && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src="https://via.placeholder.com/300"
        onLoad={() => setCarregando(false)}
        className={`w-full h-full object-cover ${carregando ? "invisible" : ""}`}
        alt="Imagem"
      />
    </div>
  );
}
