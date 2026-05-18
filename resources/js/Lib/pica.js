// Lib/pica.js

import pica from 'pica';

const picaInstance = pica({
  features: ['js', 'wasm', 'ww'],
});

export default picaInstance;