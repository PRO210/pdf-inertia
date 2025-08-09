

const Footer = ({ano}) => {
  return (
    <section className="bg-white">
      <div className="max-w-screen-xl px-4 py-4 mx-auto  overflow-hidden sm:px-6 lg:px-8">
        <nav className="flex flex-wrap justify-center -mx-5 -my-2">
    
        </nav>

        <div className="flex justify-center  space-x-6 text-gray-400">
          <p>Pro - Pdf</p>
        </div>

       
        <p className=" text-base leading-6 text-center text-gray-400">© {ano} , Todos os direitos reservados.</p>
      </div>
    </section>
  );
};

export default Footer;
