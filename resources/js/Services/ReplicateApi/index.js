// Services/ReplicateApi.js

import axios from 'axios';

export async function waitForReplicateResult(predictionId) {

  let tentativas = 0;
  const maxTentativas = 30;

  while (tentativas < maxTentativas) {

    try {

      const response = await axios.get(
        `/imagens/replicate-status/${predictionId}`
      );

      const data = response.data;

      console.log(
        `🔄 Status atual (${tentativas + 1}):`,
        data.status
      );

      if (data.status === 'succeeded') {
        return Array.isArray(data.output)
          ? data.output[0]
          : data.output;
      }

      if (data.status === 'failed') {
        return null;
      }

    } catch (err) {

      console.error('Erro no polling:', err);

    }

    tentativas++;

    await new Promise(resolve =>
      setTimeout(resolve, 3000)
    );
  }

  return null;
}