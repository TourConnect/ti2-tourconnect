/* global describe it expect beforeAll */
const faker = require('faker');
const app = require('../index');
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
  describe('key', () => {
    it('try an invalid key', async () => {
      const retVal = await app.validateToken({ token: { apiKey: faker.random.uuid() } });
      expect(retVal).toBe(false);
    });
    it('try a valid key', async () => {
      const retVal = await app.validateToken({ token: { apiKey: validKey } });
      expect(retVal).toBe(true);
    });
  });
  describe('profile', () => {
    it('should be able to retrieve a profile', async () => {
      const retVal = await app.getProfile({ token: { apiKey: validKey } });
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
      const retVal = await app.updateProfile({ payload: nuData, token: { apiKey: validKey } });
      expect(retVal).toBe(true);
      const newVal = await app.getProfile({ token: { apiKey: validKey } });
      expect(newVal.name).toBe(nuData.name);
      expect(newVal.description).toBe(nuData.description);
      expect(newVal.website).toBe(nuData.website);
      expect(newVal.address).toEqual(expect.objectContaining(nuData.address));
    });
  });
});
