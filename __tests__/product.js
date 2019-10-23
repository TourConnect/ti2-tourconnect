/* global describe beforeAll it expect */
const faker = require('faker');
const app = require('../index');

const { env: { 'ti2-tourconnect-userTestToken': validKey } } = process;

describe('products', () => {
  let allProducts;
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
  const testProduct = {
    productName: faker.commerce.productName(),
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
  beforeAll(async () => {
    // create a new location to add products to
    const { locationId } = await app.addProfile(testLocation);
    testProduct.locationId = locationId;
  });
  it('should be able to create a product', async () => {
    const retVal = await app.addProfile(testLocation);
    expect(Object.keys(retVal)).toEqual(expect.arrayContaining(['locationId']));
    testProduct.productId = retVal.productId;
  });
  it('should be able to retrieve all products', async () => {
    allProducts = await app.getProducts(validKey);
    expect(Array.isArray(allProducts)).toBe(true);
  });
  it('the new product should be on the list', async () => {
    expect(allProducts.map(({ productId }) => productId))
      .toEqual(expect.arrayContaining([testProduct.productId]));
  });
  it('should be able to retrieve a product', async () => {
    const retVal = await app.getProduct({
      locationId: testProduct.locationId,
      productId: testProduct.productId,
      token: validKey,
    });
    expect(retVal).objectContainig(testProduct);
  });
  it('should be able to update a product', async () => {
    const nuData = {
      productName: faker.company.companyName(),
      description: faker.lorem.paragraph(),
    };
    const retVal = await app.updateLocation({
      locationId: testLocation.locationId,
      payload: nuData,
      token: validKey,
    });
    expect(retVal).toBe(true);
    const updatedLocation = await app.getLocation({
      locationId: testProduct.locationId,
      productId: testProduct.productId,
      token: validKey,
    });
    expect(updatedLocation).objectContainig({ ...testProduct, ...nuData });
  });
});
