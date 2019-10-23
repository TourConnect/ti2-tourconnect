/* global describe it expect */
const faker = require('faker');
const app = require('../index');

const { env: { 'ti2-tourconnect-userTestToken': validKey } } = process;

describe('location', () => {
  const testLocation = {
    locationName: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    media: {
      images: [
        {
          url: faker.image.image(),
        },
        {
          url: faker.image.image(),
        },
      ],
    },
    location: {
      country: faker.address.country(),
      state: faker.address.state(),
      city: faker.address.city(),
      postalCode: faker.address.zipCode().toString(),
      address1: faker.address.streetAddress(),
      address2: null,
      gps: {
        lat: faker.address.latitude(),
        lng: faker.address.longitude(),
      },
    },
  };
  let allLocations;
  it('should be able to create a location', async () => {
    const retVal = await app.addProfile(testLocation);
    expect(Object.keys(retVal)).toEqual(expect.arrayContaining(['locationId']));
    testLocation.locationId = retVal.locationId;
  });
  it('should be able to retrieve all locations', async () => {
    allLocations = await app.getProfile(validKey);
    expect(Array.isArray(allLocations)).toBe(true);
  });
  it('the new location should be on the list', async () => {
    expect(allLocations.map(({ locationId }) => locationId))
      .toEqual(expect.arrayContaining([testLocation.locationId]));
  });
  it('should be able to retrieve a location', async () => {
    const retVal = await app.getLocation({ locationId: testLocation.locationId, token: validKey });
    expect(retVal).objectContainig(testLocation);
  });
  it('should be able to update a location', async () => {
    const nuData = {
      locationName: faker.company.companyName(),
      description: faker.lorem.paragraph(),
    };
    const retVal = await app.updateLocation({
      locationId: testLocation.locationId,
      payload: nuData,
      token: validKey,
    });
    expect(retVal).toBe(true);
    const updatedLocation = await app.getLocation({
      locationId: testLocation.locationId,
      token: validKey,
    });
    expect(updatedLocation).objectContainig({ ...testLocation, ...nuData });
  });
});
