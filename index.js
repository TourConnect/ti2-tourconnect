require('dotenv').config();
const request = require('request-promise');

const { env: { 'ti2-tourconnect-apiUrl': apiUrl } } = process;

const getHeaders = (token) => ({
  Authorization: `Bearer ${Buffer.from(token).toString('base64')}`,
  'Content-Type': 'text-plain',
});

const validateToken = async (token) => {
  if (!token) return false;
  try {
    const profile = await request({
      method: 'post',
      uri: `${apiUrl}/api/company`,
      headers: getHeaders(token),
      body: '{companyId}',
    });
    const { companyProfile } = JSON.parse(profile);
    if (companyProfile.companyId) return true;
  } catch (err) {
    return false;
  }
  return false;
};
const getProfile = async (token) => {
  const profile = await request({
    method: 'post',
    uri: `${apiUrl}/api/company`,
    headers: getHeaders(token),
    body: '{ name:companyName description website telephone:phone }',
  });
  return JSON.parse(profile).companyProfile;
};
const updateProfile = async ({ token, payload }) => {
  // re-map
  const newPayload = {
    companyName: payload.name,
    description: payload.description,
  };
  await request({
    method: 'put',
    uri: `${apiUrl}/api/company`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: newPayload,
    json: true,
  });
  return true;
};
module.exports = {
  validateToken,
  getProfile,
  updateProfile,
};
