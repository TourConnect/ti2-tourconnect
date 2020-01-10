require('dotenv').config();
const request = require('request-promise');
const Promise = require('bluebird');

const {
  env: {
    'ti2-tourconnect-apiUrl': apiUrl,
  },
} = process;

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

const locationMapOut = {
  telephone: (val) => (['phone', val]),
  location: (addressVal) => (['address', doMap(addressVal, {
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

const locationMapIn = {
  phone: (val) => (['telephone', val]),
  address: (addressVal) => (['location', doMap(addressVal, {
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

const validateToken = async ({ token }) => {
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
const getProfile = async ({ token }) => {
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
    media { image { mediaType, url } },
    address { country, state, city, postalCode, addressOne, addressTwo, loc { coordinates, type } },
    contacts { email, fax, firstName, lastName, name, phone, type },
    coverImageUrl, website, phone, notes, roomCount, productType  } }`;
const getLocations = async ({ token }) => {
  const resp = await request({
    method: 'post',
    uri: `${apiUrl}/api/company`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: locationGet,
    json: true,
  });
  const { companyProfile: { locations } } = resp;
  return locations.map((location) => doMap(location, locationMapIn));
};

const removeEmpty = (obj) => {
  const retVal = {};
  Object.entries(obj).forEach(([attribute, value]) => {
    if ((!Array.isArray(value) && value !== null && value !== undefined)
      || (Array.isArray(value) && value.length > 0)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        if (Object.keys(value).length > 0) {
          retVal[attribute] = removeEmpty(value);
        }
      } else {
        retVal[attribute] = value;
      }
    }
  });
  return retVal;
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
  const { companyProfile: { locations: [location] } } = res;
  return removeEmpty(doMap(location, locationMapIn));
};


const copyMedia = async ({ oldMedia, token }) => {
  const newMedia = {};
  await Promise.each(Object.keys(oldMedia), async (mediaType) => {
    await Promise.each(oldMedia[mediaType], async (meta) => {
      const { url } = meta;
      const fileHeaders = await request.head(url);
      const contentType = fileHeaders['content-type'];
      if (!contentType) return {};
      const fileName = (() => {
        const urlName = `${(Buffer.from(url, 'utf-8').toString('base64'))}.${contentType.split('/')[1]}`;
        if (!fileHeaders['content-disposition']
          || fileHeaders['content-disposition'].indexOf('filename=') < 0) {
          return urlName;
        }
        return fileHeaders['content-disposition'].toLowerCase()
          .split('filename=')[1]
          .split(';')[0]
          .replace(/"/g, '');
      })();
      const binary = await request({
        method: 'get',
        uri: url,
        followRedirect: true,
        encoding: null,
      });
      const { signedUrl, url: newUrl } = await request({
        method: 'get',
        uri: `${apiUrl}/s3/sign?s3_object_type=${contentType}&s3_file_name=${fileName}`,
        headers: {
          ...getHeaders(token),
        },
        json: true,
      });
      await request({
        method: 'put',
        uri: signedUrl,
        headers: {
          'Content-Type': contentType,
        },
        body: binary,
      });
      const genre = contentType.split('/')[0];
      if (!newMedia[genre]) newMedia[genre] = [];
      newMedia[genre].push({
        ...meta,
        url: newUrl,
        mediaType: contentType,
      });
    });
  });
  return newMedia;
};

const createLocation = async ({ token, payload }) => {
  const media = await (async () => {
    if (payload.media) {
      return copyMedia({ oldMedia: payload.media, token });
    }
    return {};
  })();
  const { location: { _id: locationId } } = await request({
    method: 'post',
    uri: `${apiUrl}/api/location`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: doMap({
      ...payload,
      media,
    }, locationMapOut),
    json: true,
  });
  return ({ locationId });
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
      ...doMap(payload, locationMapOut),
      locationId,
    },
    json: true,
  });
  return true;
};

const productGet = ({ locationId }) => `{
  locations (locationId: "${locationId}"){
    locationId,
    products {
      productId,
      productName, productType, productCode, description, notes, coverImageUrl,
      interconnectingRooms, amenities, roomCountInfo { value, unit },
      media { image { mediaType, url } },
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
  const [{ products }] = resp.companyProfile.locations
    .filter(({ locationId: locId }) => locId === locationId);
  return products.map((product) => removeEmpty(product));
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
  if (resp.companyProfile.locations.length !== 1
    || resp.companyProfile.locations[0].products.length !== 1
  ) return undefined;
  const {
    companyProfile: {
      locations: [
        {
          products: [
            product,
          ],
        },
      ],
    },
  } = resp;
  return removeEmpty({
    ...product,
    locationId,
  });
};

const createProduct = async ({ token, locationId, payload }) => {
  const media = await (async () => {
    if (payload.media) {
      return copyMedia({ oldMedia: payload.media, token });
    }
    return {};
  })();
  const resp = request({
    method: 'post',
    uri: `${apiUrl}/api/product`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: {
      locationId,
      ...payload,
      media,
    },
    json: true,
  });
  return resp;
};

const updateProduct = async ({
  token,
  locationId,
  productId,
  payload,
}) => {
  await request({
    method: 'post',
    uri: `${apiUrl}/api/product`,
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: {
      locationId,
      productId,
      ...payload,
    },
    json: true,
  });
  return true;
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
  getProduct,
  createProduct,
  updateProduct,
};
