

const Footer = ({ ano }) => {
  return (
    <section className="bg-white text-black dark:text-white/70 py-2 mt-8">
      <div className="max-w-screen-xl py-1 mx-auto  overflow-hidden sm:px-6 lg:px-8">       
        <p className="text-base leading-6 text-center text-gray-400">© Pro-Pdf {ano}, Todos os direitos reservados.</p>
        <p className="text-center text-gray-600">Contato: proandre210@gmail.com</p>
      </div>
    </section>
  );
};

export default Footer;
