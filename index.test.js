/* global describe it expect */
const faker = require('faker');
const app = require('./index');

describe('should be able to test a key', () => {
  it('try an invalid key', async () => {
    const retVal = await app.validateToken(faker.random.uuid());
    expect(retVal).toBe(false);
  });
  it('try a valid key', async () => {
    const { env: { 'ti2-tourconnect-userTestToken': validKey } } = process;
    const retVal = await app.validateToken(validKey);
    expect(retVal).toBe(true);
  });
});
