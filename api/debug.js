const { google } = require('googleapis');

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const sheetId = process.env.SHEET_ID;

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // Verificar credenciales
    if (!credentials || !credentials.project_id) {
      return res.status(400).json({
        exito: false,
        error: 'GOOGLE_CREDENTIALS inválidas',
      });
    }

    if (!sheetId) {
      return res.status(400).json({
        exito: false,
        error: 'SHEET_ID no configurado',
      });
    }

    // Intentar conectar a Google Sheets
    const sheets = google.sheets({
      version: 'v4',
      auth: new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      }),
    });

    // Intentar leer un rango
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Inventario!A1:G5', // Solo primeras 5 filas
    });

    return res.status(200).json({
      exito: true,
      mensaje: 'Google Sheets conectado correctamente',
      datos: response.data.values,
      sheetId: sheetId,
      projectId: credentials.project_id,
    });
  } catch (error) {
    return res.status(500).json({
      exito: false,
      error: error.message,
      detalles: {
        sheetId: sheetId,
        credentialsType: typeof credentials,
      },
    });
  }
};