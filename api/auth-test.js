const { google } = require('googleapis');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    
    // Solo intentar autenticarse, SIN leer Sheets
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    
    return res.status(200).json({
      exito: true,
      mensaje: 'Autenticación exitosa',
      projectId: credentials.project_id,
      email: credentials.client_email,
    });
  } catch (error) {
    return res.status(500).json({
      exito: false,
      error: error.message,
      errorType: error.constructor.name,
    });
  }
};