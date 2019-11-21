/* global describe it expect */
const faker = require('faker');
const request = require('request-promise');
const app = require('../index');
const cheerio = require('cheerio');

// const { env: { 'ti2-tourconnect-userTestToken': validKey } } = process;
const { env: {
  'ti2-tourconnect-apiUrl': apiUrl,
  'ti2-tourconnect-publicUrl': publicUrl,
  'ti2-tourconnect-appToken': appToken,
} } = process;
let validKey = '';

describe('should be able to test a key', () => {
  const apiConsumerPayload = {
    appName: faker.commerce.productName(),
    authorizations: [
      '/api/company',
      '/api/contract/:contractId',
      '/api/location',
      '/api/product',
    ],
    email: faker.internet.email().toLowerCase(),
  };
  const apiUserPayload = {
    authorizations: [
      '/api/company',
      '/api/location',
      '/api/product',
    ],
  };
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
  let appKey;
  let userTestToken;
  it('try an invalid key', async () => {
    const retVal = await app.validateToken(faker.random.uuid());
    expect(retVal).toBe(false);
  });
  it('should be able to create a new app', async () => {
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
    expect(resp).toHaveProperty('result');
    appKey = resp.result._id;
  });
  it('shoud be able to create a user', async () => {
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
    const confirmationEmailLink = (() => {
      let retVal = null;
      $('a').each((i, link) => {
        if (link.attribs.href.indexOf('signin/email/confirmation') > -1) retVal = link.attribs.href;
      });
      return retVal.replace(`${publicUrl}`, '');
    })();
    expect(confirmationEmailLink).not.toBeNull();
    const token = confirmationEmailLink.replace('/signin/email/confirmation', '').split('/')[1].split('?')[0];
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
    expect(resConfirm).toHaveProperty('confirmed');
    expect(resConfirm.confirmed).toBe(true);
  });
  it('should be able to login', async () => {
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
    expect(res.jwt).toMatch(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/);
    ({ jwt: userTestToken } = res);
  });
  it('should be able to create a user token', async () => {
    const payload = {
      ...apiUserPayload,
      apiConsumerId: appKey,
    };
    const resp = await request({
      method: 'post',
      url: `${apiUrl}/api/apiUser`,
      headers: {
        Authorization: `Bearer ${userTestToken}`,
      },
      body: payload,
      json: true,
    });
    expect(resp).toHaveProperty('result');
    ({ result: { token: validKey } } = resp);
    auth = {
      Authorization: `Basic ${Buffer.from(validKey).toString('base64')}`,
    };
  });
  it('try a valid key', async () => {
    const retVal = await app.validateToken(validKey);
    expect(retVal).toBe(true);
  });
});

describe('profile', () => {
  it('should be able to retrieve a profile', async () => {
    const retVal = await app.getProfile(validKey);
    expect(Object.keys(retVal)).toEqual(expect.arrayContaining(['name', 'description', 'website', 'telephone']));
  });
  it('should be able to update a profile', async () => {
    const { address } = faker;
    const nuData = {
      name: faker.company.companyName(),
      description: faker.lorem.paragraph(),
      website: faker.internet.url(),
      address: {
        country: address.country(),
        state: address.state(),
        city: address.city(),
        postalCode: address.zipCode(),
        address1: address.streetAddress(),
        gps: {
          lat: address.latitude(),
          lng: address.longitude(),
        },
      },
    };
    const retVal = await app.updateProfile({ payload: nuData, token: validKey });
    expect(retVal).toBe(true);
    const newVal = await app.getProfile(validKey);
    expect(newVal.name).toBe(nuData.name);
    expect(newVal.description).toBe(nuData.description);
    expect(newVal.website).toBe(nuData.website);
    expect(newVal.address).toEqual(expect.objectContaining(nuData.address));
  });
});
