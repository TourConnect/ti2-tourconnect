require('dotenv').config();
const request = require('request-promise');

const { env: { 'ti2-tourconnect-apiToken': apiToken, 'ti2-tourconnect-apiUrl': apiUrl } } = process;
const defaultHeaders = {
  Authorization: `Basic ${(new Buffer(apiToken)).toString('base64')}`,
};
const validateToken = async token => {
  if (!token) return false;
  const profile = await request({
    method: 'post',
    uri: `${apiUrl}/api/company`,
    headers: {
      ...defaultHeaders,
      token,
    },
  });
  console.log({ profile });
};

module.exports = {
  validateToken,
};
