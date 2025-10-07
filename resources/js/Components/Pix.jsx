import { useState } from 'react';
import Spinner from '@/Components/Spinner';

const Pix = () => {
  const [buttonText, setButtonText] = useState(false);
  const [buttonTextCp, setButtonTextCp] = useState(false);
  const [buttonTextLoad, setButtonTextLoad] = useState(false);
  const msgSpinner = 'Copiando . . .';

  function pixCp() {
    const chave = '43a6ac21-4e54-4e1b-ac39-1e2fd2b7c697';
    setButtonText(true);
    setButtonTextLoad(true);

    const copyText = navigator.clipboard
      .writeText(chave)

      .then(() => {
        setTimeout(() => {
          setButtonTextLoad(false);
          setButtonTextCp(true);
        }, 3000);
      })
      .finally(() => {
        setTimeout(() => {
          setButtonTextLoad(false);
          setButtonTextCp(false);
          setButtonText(false);
        }, 6000);
      });

    return copyText;
  }

  const proButtonPurple = ` w-full border border-purple-500 bg-transparent text-purple-500 rounded font-semibold px-4 py-2 transition duration-500 ease select-none hover:bg-purple-600 hover:text-white focus:outline-none;
  `;

  return (
    <div id="pixSmall" className="grid grid-flow-row m-2 ">
      <div className="mx-2">
        {/* <img src={logoCafe} className="max-h-20" alt="Me Paga um Café?" /> */}
      </div>
      <div>
        <button
          onClick={() => pixCp()}
          className={proButtonPurple}
          type="button"
          value="43a6ac21-4e54-4e1b-ac39-1e2fd2b7c697"
        >
          {buttonText == false ? 'Copiar Chave Pix!' : null}

          {buttonTextLoad && (
            <div className="flex items-center justify-center">
              <Spinner size={30} />
              <span className="ml-4">{msgSpinner}</span>
            </div>
          )}

          {buttonTextCp == true ? 'Copiado!' : null}

          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 22 22"
            width="28"
            height="28"
            className={` ${buttonText == true ? 'hidden' : 'inline-block'
              } bi bi-check-circle ml-2 `}
            fill="currentColor"
          >
            <g>
              <path fill="none" d="M0 0h24v24H0z" />
              <path d="M7 6V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3v3c0 .552-.45 1-1.007 1H4.007A1.001 1.001 0 0 1 3 21l.003-14c0-.552.45-1 1.007-1H7zm2 0h8v10h2V4H9v2z" />
            </g>
          </svg>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            fill="currentColor"
            className={` ${buttonTextCp == false ? 'hidden' : 'inline-block'
              } bi bi-check-circle ml-2 `}
            viewBox="0 0 18 18"
          >
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
            <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pix;
