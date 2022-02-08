/* global describe it expect beforeAll */
const faker = require('faker');
const Plugin = require('../index');

const app = new Plugin();

const token = {
  apiUrl: process.env.ti2_tourconnect_apiUrl,
  appToken: process.env.ti2_tourconnect_appToken,
};

const {
  createUser,
  createApp,
  createAppUser,
} = require('./utils');

describe('profile and key tests', () => {
  let validKey = '';
  beforeAll(async () => {
    const { jwt } = await createUser();
    const appKey = await createApp();
    validKey = await createAppUser({ appKey, userToken: jwt });
  });
  describe.only('key', () => {
    it.only('try an invalid key', async () => {
      const retVal = await app.validateToken({ token: { ...token, apiKey: faker.random.uuid() } });
      expect(retVal).toBe(false);
    });
    it('try a valid key', async () => {
      const retVal = await app.validateToken({ token: { ...token, apiKey: validKey } });
      expect(retVal).toBe(true);
    });
  });
  describe('profile', () => {
    it('should be able to retrieve a profile', async () => {
      const retVal = await app.getProfile({ token: { ...token, apiKey: validKey } });
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
      const retVal = await app.updateProfile({
        payload: nuData,
        token: { ...token, apiKey: validKey },
      });
      expect(retVal).toBe(true);
      const newVal = await app.getProfile({ token: { ...token, apiKey: validKey } });
      expect(newVal.name).toBe(nuData.name);
      expect(newVal.description).toBe(nuData.description);
      expect(newVal.website).toBe(nuData.website);
      expect(newVal.address).toEqual(expect.objectContaining(nuData.address));
    });
  });
});
