const fs = require('fs');

const path = 'c:/Users/Sistemas2/Desktop/farenet nuevo proyecto/farenetFrontend/src/services/api.ts';
let content = fs.readFileSync(path, 'utf8');

const additional = `
export const authFaregasApi = {
  loginAsync: async (username: string, password?: string): Promise<any> => {
    const response = await fetchWithTimeout(\`\${BASE_URL}/faregas/auth/login\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
      const error = await getErrorMessage(response, 'Error en inicio de sesión FAREGAS');
      throw new Error(error);
    }
    return response.json();
  },
  confirmarPlantaAsync: async (plantaKey: string, preToken: string): Promise<any> => {
    const response = await fetchWithTimeout(\`\${BASE_URL}/faregas/auth/confirmar-planta\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${preToken}\`
      },
      body: JSON.stringify({ plantaKey })
    });
    if (!response.ok) {
      const error = await getErrorMessage(response, 'Error al confirmar planta en FAREGAS');
      throw new Error(error);
    }
    return response.json();
  }
};
`;

fs.writeFileSync(path, content + additional);
console.log('Appended authFaregasApi to api.ts');
