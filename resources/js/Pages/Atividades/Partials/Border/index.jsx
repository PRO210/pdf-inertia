

const SelectBoader = ({ border }) => {
  return (
    <div>
      <select
        id="border"    
        value={border}       
        onChange={(e) => handleBorder(e.target.value)}
      >      
        {/* <option value="aquarela_de_lapis">Aquarela de Lápis </option> */}
        <option value="coracaoPortrait">Corações Alinhados </option>
        <option value="coracao_portrait_vazado">
          Corações Alinhados (Vazado){' '}
        </option>
        <option value="baloes_coloridos">Bandeiras Coloridos </option>
        <option value="baloes_coloridos_vazados">
          Bandeiras Coloridos Vazados
        </option>
        <option value="milhos_fofos">Uma fofura de milhos</option>
        <option value="fogueira">Fogueirinha</option>      
        <option value="abelha">Abelinhas</option>
      </select>
    </div>
  );
};

export default SelectBoader;
