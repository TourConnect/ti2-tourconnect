/* global describe it expect */
const faker = require('faker');
const app = require('../index');

const { env: { 'ti2-tourconnect-userTestToken': validKey } } = process;

describe('should be able to test a key', () => {
  it('try an invalid key', async () => {
    const retVal = await app.validateToken(faker.random.uuid());
    expect(retVal).toBe(false);
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
    const nuData = {
      name: faker.company.companyName(),
      description: faker.lorem.paragraph(),
    };
    const retVal = await app.updateProfile({ payload: nuData, token: validKey });
    expect(retVal).toBe(true);
    const newVal = await app.getProfile(validKey);
    expect(newVal.name).toBe(nuData.name);
    expect(newVal.description).toBe(nuData.description);
  });
});
