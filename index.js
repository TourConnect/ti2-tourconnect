require('dotenv').config();
const request = require('request-promise');

const { env: {
  'ti2-tourconnect-apiUrl': apiUrl,
} } = process;

const getHeaders = (token) => ({
  Authorization: `Bearer ${Buffer.from(token).toString('base64')}`,
  'Content-Type': 'text-plain',
});
const doMap = (obj, map) => {
  const retVal = {};
  Object.entries(obj).forEach(([attribute, value]) => {
    if (map[attribute]) {
      const [remapName, newVal] = map[attribute](value);
      if (newVal !== undefined) {
        retVal[remapName] = newVal;
      }
    } else {
      retVal[attribute] = value;
    }
  });
  return retVal;
};

const mapOut = {
  name: (val) => (['companyName', val]),
  telephone: (val) => (['phone', val]),
  address: (addressVal) => (['address', doMap(addressVal, {
    address1: (val) => (['addressOne', val]),
    address2: (val) => (['addressTwo', val]),
    gps: (val) => (['coordinates', (() => {
      if (val.lat && val.lng) {
        return [parseFloat(val.lng), parseFloat(val.lat)];
      }
      return val;
    })()]),
  })]),
};

const mapIn = {
  companyName: (val) => (['name', val]),
  phone: (val) => (['telephone', val]),
  address: (addressVal) => (['address', doMap(addressVal, {
    addressOne: (val) => (['address1', val || undefined]),
    addressTwo: (val) => (['address2', val || undefined]),
    loc: (val) => (['gps', (() => {
      if (val && Array.isArray(val.coordinates) && val.coordinates.length === 2) {
        const [lng, lat] = val.coordinates;
        return { lat: lat.toString(), lng: lng.toString() };
      }
      return undefined;
    })()]),
  })]),
};

const validateToken = async (token) => {
  if (!token) return false;
  try {
    const profile = await request({
      method: 'post',
      uri: `${apiUrl}/api/company`,
      headers: getHeaders(token),
      body: '{companyId}',
    });
    const { companyProfile } = JSON.parse(profile);
    if (companyProfile.companyId) return true;
  } catch (err) {
    return false;
  }
  return false;
};
const getProfile = async (token) => {
  const profile = await request({
    method: 'post',
    uri: `${apiUrl}/api/company`,
    headers: getHeaders(token),
    body: '{ companyName description website  phone address { addressOne addressTwo city state country postalCode loc { coordinates }} }',
  });
  return doMap(JSON.parse(profile).companyProfile, mapIn);
};
const updateProfile = async ({ token, payload }) => {
  // re-map
  // const newPayload = {
  //   companyName: payload.name,
  //   ...payload,
  // };
  const newPayload = doMap(payload, mapOut);
  await request({
    method: 'put',
    uri: `${apiUrl}/api/company`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: newPayload,
    json: true,
  });
  return true;
};
const locationGet = `{
  locations {
    locationId, locationName, description,
    address { country, state, city, postalCode, addressOne, addressTwo, loc { coordinates, type } },
    contacts { email, fax, firstName, lastName, name, phone, type },
    coverImageUrl, website, phone, notes, roomCount, productType  } }`;
const getLocations = async ({ token }) => {
  const resp = await request({
    method: 'post',
    uri:`${apiUrl}/api/company`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: locationGet,
    json: true,
  });
  const { companyProfile: { locations } } = resp;
  return locations;
};

const getLocation = async ({ token, locationId }) => {
  const res = await request({
    method: 'post',
    uri: `${apiUrl}/api/company`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: locationGet.replace(
      'locations {',
      `locations (locationId: "${locationId}") {`,
    ),
    json: true,
  });
  const { companyProfile: { locations } } = res;
  return locations[0];
};

const createLocation = async ({ token, payload }) => {
  const resp = await request({
    method: 'post',
    uri: `${apiUrl}/api/location`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: payload,
    json: true,
  });
  return ({ locationId: resp.location._id });
};

const updateLocation = async ({ token, locationId, payload }) => {
  await request({
    method: 'post',
    uri: `${apiUrl}/api/location`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: {
      ...payload,
      locationId,
    },
    json: true,
  });
  return true;
};

const productGet = ({ locationId }) => `{
  locations (locationId: "${locationId}"){
    locationId
    products {
      productName, productType, productCode, description, notes, coverImageUrl,
      interconnectingRooms, amenities, roomCountInfo { value, unit },
      roomSizeInfo { value, unit }, totalMaxPassengers, totalMinPassengers,
      tourDuration { value, unit }, tourDurationDoesNotApply,
      productInfo { include, exclude, whatToBring },
      bedsAndSofas {
        isApartment,
        rooms {
         count,
         bedType,
         other
        }
      },
    }
  }}`;
const getProducts = async ({ token, locationId }) => {
  const resp = await request({
    method: 'post',
    uri: `${apiUrl}/api/company`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: productGet({ locationId }),
    json: true,
  });
};

const getProduct = async ({ token, locationId, productId }) => {
  const singleGet = productGet({ locationId }).replace('products ', `products (productId: "${productId}")`);
  const resp = await request({
    method: 'post',
    uri: `${apiUrl}/api/company`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: singleGet,
    json: true,
  });
  const {
    body: {
      companyProfile: {
        locations: [
          {
            products: [
              product,
            ],
          },
        ],
      },
    },
  } = resp;
  return product;
};

const createProduct = async ({ token, locationId, payload }) => {
  const resp = request({
    method: 'post',
    uri: `${apiUrl}/api/product`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: payload,
    json: true,
  });
};

const updateProduct = async ({ token, locationId, productId, payload }) => {
  const resp = await request({
    method: 'post',
    uri: `${apiUrl}/api/product`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: {
      locationId,
      productId,
      payload,
    },
    json: true,
  });
};

module.exports = {
  validateToken,
  getProfile,
  updateProfile,
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  getProducts,
  getProducts,
  createProduct,
  updateProduct,
};
