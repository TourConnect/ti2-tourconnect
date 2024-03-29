/* global describe it expect beforeAll */
const faker = require('faker');

const Plugin = require('../index');

const app = new Plugin();

const token = {
  apiUrl: process.env.ti2_tourconnect_apiUrl,
};

const {
  createUser,
  createApp,
  createAppUser,
} = require('./utils');

describe('location', () => {
  const testLocation = {
    locationName: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    media: {
      image: [
        {
          url: 'https://source.unsplash.com/random',
        },
        {
          url: 'https://source.unsplash.com/random',
        },
      ],
    },
    roomCount: faker.random.number({ min: 1, max: 100 }),
    location: {
      country: faker.address.country(),
      state: faker.address.state(),
      city: faker.address.city(),
      postalCode: faker.address.zipCode().toString(),
      address1: faker.address.streetAddress(),
      gps: {
        lat: faker.address.latitude(),
        lng: faker.address.longitude(),
      },
    },
    productType: 'accommodation', // or non-accomodation
  };
  const expectedMedia = {
    image: expect.arrayContaining([
      expect.objectContaining({
        mediaType: expect.any(String),
        url: expect.any(String),
      }),
    ]),
  };
  let allLocations;
  beforeAll(async () => {
    const { jwt } = await createUser();
    const appKey = await createApp();
    token.apiKey = await createAppUser({ appKey, userToken: jwt });
  });
  it('should be able to create a location', async () => {
    const retVal = await app.createLocation({ token, payload: testLocation });
    expect(Object.keys(retVal)).toEqual(expect.arrayContaining(['locationId']));
    testLocation.locationId = retVal.locationId;
  });
  it('should be able to retrieve all locations', async () => {
    allLocations = await app.getLocations({ token });
    expect(Array.isArray(allLocations)).toBe(true);
  });
  it('the new product should be on the list', async () => {
    expect(allLocations.map(({ productId }) => productId))
      .toEqual(expect.arrayContaining([testLocation.productId]));
  });
  it('should be able to retrieve a location', async () => {
    const retVal = await app.getLocation({
      locationId: testLocation.locationId,
      token,
    });
    expect(retVal).toEqual(
      expect.objectContaining({
        ...testLocation,
        media: expectedMedia,
      }),
    );
  });
  it('should be able to update a location', async () => {
    const nuData = {
      locationName: faker.company.companyName(),
      description: faker.lorem.paragraph(),
    };
    const retVal = await app.updateLocation({
      locationId: testLocation.locationId,
      payload: nuData,
      token,
    });
    expect(retVal).toBe(true);
    const updatedLocation = await app.getLocation({
      locationId: testLocation.locationId,
      token,
    });
    expect(updatedLocation).toEqual(
      expect.objectContaining({
        ...testLocation,
        ...nuData,
        media: expectedMedia,
      }),
    );
  });
});
