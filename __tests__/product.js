/* global describe beforeAll it expect */
const faker = require('faker');
const app = require('../index');
const {
  createUser,
  createApp,
  createAppUser,
} = require('./utils');

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
  let token;
  beforeAll(async () => {
    // create a new location to add products to
    const { jwt } = await createUser();
    const appKey = await createApp();
    token = await createAppUser({ appKey, userToken: jwt });
    // create the test location
    const { locationId } = await app.createLocation({ token, payload: testLocation });
    testProduct.locationId = locationId;
    testLocation.locationId = locationId;
  });
  it('should be able to create a product', async () => {
    const retVal = await app.createProduct({
      token,
      locationId: testLocation.locationId,
      payload: testProduct,
    });
    expect(Object.keys(retVal)).toEqual(expect.arrayContaining(['productId']));
    testProduct.productId = retVal.productId;
  });
  it('should be able to retrieve all products', async () => {
    allProducts = await app.getProducts({ token, locationId: testProduct.locationId });
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
      token,
    });
    expect(retVal).toEqual(
      expect.objectContaining(testProduct),
    );
  });
  it('should be able to update a product', async () => {
    const nuData = {
      productName: faker.company.companyName(),
      description: faker.lorem.paragraph(),
    };
    const retVal = await app.updateProduct({
      locationId: testLocation.locationId,
      productId: testProduct.productId,
      payload: nuData,
      token,
    });
    expect(retVal).toBe(true);
    const updatedProduct = await app.getProduct({
      locationId: testLocation.locationId,
      productId: testProduct.productId,
      token,
    });
    expect(updatedProduct).toEqual(
      expect.objectContaining({
        ...testLocation,
        ...nuData,
      }),
    );
  });
});
