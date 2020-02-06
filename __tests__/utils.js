const faker = require('faker');
const request = require('request-promise');
const cheerio = require('cheerio');
const assert = require('assert');
require('dotenv').config();

const {
  env: {
    'ti2-tourconnect-apiUrl': apiUrl,
    'ti2-tourconnect-appToken': appToken,
  },
} = process;

const createUser = async () => {
  const newUserPayload = {
    companyTypeChecked: ['Hotel'],
    selectedCompanyType: 'Accommodation',
    acctCreationReason: 'find-new-agents',
    country: 'Mexico',
    howTheyHeard: 'coworker-colleague',
    companyName: faker.company.companyName(),
    email: faker.internet.email().toLowerCase(),
    password: '123456',
    oneOrMultiProperties: 'multi-prop',
    numOfProperties: '2 - 25',
    foundExistingCompanyInfo: [],
    region: 'America/Chicago',
  };
  await request({
    method: 'post',
    uri: `${apiUrl}/signUpUser`,
    headers: {
      Authorization: `Basic ${appToken}`,
    },
    body: newUserPayload,
    json: true,
  });
  // read the user confirmation email
  const uri = `${apiUrl}/test/readEmail/${encodeURIComponent(newUserPayload.email)}%20email-confirmation?html=true`;
  const htmlEmail = await request({
    method: 'get',
    uri,
  });
  const $ = cheerio.load(htmlEmail);
  const token = (() => {
    let retVal = null;
    $('a').each((i, link) => {
      if (link.attribs.href.indexOf('signin/email/confirmation') > -1) retVal = link.attribs.href;
    });
    return retVal.split('/signin/email/confirmation/')[1].split('?')[0];
  })();
  assert(token != null);
  // confirm the account
  const resConfirm = await request({
    method: 'put',
    headers: {
      Authorization: `Basic ${appToken}`,
    },
    uri: `${apiUrl}/confirm-signin-email`,
    body: { token },
    json: true,
  });
  assert(resConfirm.confirmed);
  // login as the user
  const res = await request({
    method: 'post',
    uri: `${apiUrl}/signin`,
    headers: {
      Authorization: `Basic ${appToken}`,
    },
    body: {
      email: newUserPayload.email,
      password: newUserPayload.password,
    },
    json: true,
  });
  const { jwt } = res;
  assert((/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/).test(jwt));
  return ({ user: newUserPayload, jwt });
};

const createApp = async () => {
  const apiConsumerPayload = {
    appName: faker.commerce.productName(),
    authorizations: [
      '/api/company',
      '/api/location',
      '/api/product',
    ],
    email: faker.internet.email().toLowerCase(),
  };
  const uri = `${apiUrl}/api/apiConsumer`;
  const resp = await request({
    method: 'post',
    uri,
    headers: {
      Authorization: `Bearer ${appToken}`,
    },
    body: apiConsumerPayload,
    json: true,
  });
  assert(resp.result);
  const { result: { _id: appKey } } = resp;
  assert(appKey);
  return appKey;
};

const createAppUser = async ({ appKey, userToken }) => {
  const apiUserPayload = {
    authorizations: [
      '/api/company',
      '/api/location',
      '/api/product',
    ],
  };
  const payload = {
    ...apiUserPayload,
    apiConsumerId: appKey,
  };
  const resp = await request({
    method: 'post',
    url: `${apiUrl}/api/apiUser`,
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
    body: payload,
    json: true,
  });
  const { result: { token: validKey } } = resp;
  assert(validKey);
  return validKey;
};

module.exports = {
  createUser,
  createApp,
  createAppUser,
};
