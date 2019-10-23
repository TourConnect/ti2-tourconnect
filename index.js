require('dotenv').config();
const request = require('request-promise');

const { env: { 'ti2-tourconnect-apiUrl': apiUrl } } = process;
const getHeaders = token =>({
  Authorization: `Bearer ${(new Buffer(token)).toString('base64')}`,
  'Content-Type': 'text-plain',
});

const validateToken = async token => {
  if (!token) return false;
  try {
    const profile = await request({
      method: 'post',
      uri: `${apiUrl}/api/company`,
      headers: getHeaders(token),
      body: '{companyId}',
    });
    if (profile.statusCode = 200) return true;
  } catch (err) {
    return false;
  }
  return false;
};
const getProfile = async token => {
  const profile = await request({
    method: 'post', 
    uri: `${apiUrl}/api/company`,
    headers: getHeaders(token),
    body: '{ name:companyName description website telephone:phone }',
  });
  return JSON.parse(profile).companyProfile;
};
module.exports = {
  validateToken,
  getProfile,
};
