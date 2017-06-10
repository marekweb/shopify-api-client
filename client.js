const got = require('got');
const checkOptions = require('check-options');
const Promise = require('bluebird');
const debug = require('debug')('shopify-`client');

// Utility function to get a particular property, used with .then()
function accessProperty(property) {
  return function(object) {
    if (!Object.prototype.hasOwnProperty.call(object, property)) {
      throw new Error(
        `No such property to access: ${property}, only: ${Object.keys(object)}`
      );
    }

    return object[property];
  };
}

module.exports = class ShopifyClient {
  constructor(options) {
    checkOptions(options, ['hostname', 'accessToken']);

    let { hostname, accessToken } = options;

    this.hostname = hostname;
    this.accessToken = accessToken;
  }

  makeRequest(method, path, data = {}) {
    method = method.toUpperCase();

    const url = `https://${this.hostname}/admin/${path}`;

    debug(`${method} ${url}`);

    const requestOptions = {
      method: method,
      headers: {
        'X-Shopify-Access-Token': this.accessToken
      },
      json: true,
      timeout: 10000
    };

    if (method === 'GET') {
      requestOptions.query = data;
    } else {
      requestOptions.body = data;
    }

    return got(url, requestOptions).then(response => {
      debug(`${response.statusCode} ${response.requestUrl}`);

      let callLimit = response.headers['x-shopify-shop-api-call-limit'];

      if (callLimit) {
        callLimit = parseInt(callLimit.split('/'));

        //if (callLimit >= 40) {
        //    delayMilliSecs = 500;
        //}
      }

      debug('Call Limit: ' + callLimit);
      console.log(callLimit, delayMilliSecs);

      return response.body;

      //return Promise.delay(delayMilliSecs).then(() => { return response.body})
    });

    //return request(requestOptions).then(response => {
    //    // debug(response.request.uri.href);

    //    const callLimit = response.headers['x-shopify-shop-api-call-limit'];
    //    if (callLimit) {
    //        callLimit = parseInt(callLimit.split('/'));
    //    }
    //    debug('Call Limit: ' + callLimit);
    //    return response.body;
    //});
  }

  //TODO:
  //Promise.delay method that takes both the callLimit and response.body from got promise
  //If callLimit is 40, delay 500ms, if not, delay 0
  //Then returns the response.body

  makeRequestWithRetry(method, path, data = {}) {
    // Create a function that we can call recursively
    const tryRequest = () => {
      return this.makeRequest(method, path, (data = {})).catch(err => {
        if (err.response.statusCode === 429) {
          return Promise.delay(500).then(tryRequest);
        }
        throw err;
      });
    }


    return tryRequest();
  }

  getShop() {
    return this.makeRequestWithRetry('get', 'shop.json')
      .then(accessProperty('shop'))
      .catch(error => {
        console.log(error.response.body);
      });
  }

  getProducts(options) {
    return this.makeRequest('get', 'products.json', options)
      .then(accessProperty('products'))
      .catch(error => {
        console.log(error);
      });
  }

  getProduct(id) {
    return this.makeRequest('get', `products/${id}.json`)
      .then(accessProperty('product'))
      .catch(error => {
        if (error.response.statusCode === 404) {
          console.log(error.statusMessage, 'Product does not exist');
        } else {
          console.log(error, 'product error');
        }
      });
  }

  createProduct(product) {
    return this.makeRequest('post', `products.json`, { product })
      .then(accessProperty('product'))
      .catch(error => {
        console.log(error);
        console.log(error.response.body);
      });
  }

  updateProduct(id, product) {
    return this.makeRequest('put', `products/${id}.json`, { product })
      .then(accessProperty('product'))
      .catch(error => {
        console.log(error);
      });
  }

  deleteProduct(id) {
    return this.makeRequest('delete', `products/${id}.json`)
      .catch(error => {
        console.log(error);
      });
  }

  getProductVariant(id) {
    return this.makeRequest('get', `variants/${id}.json`)
      .then(accessProperty('variant'))
      .catch(error => {
        console.log(error);
      });
  }

  updateProductVariant(id, variant) {
    return this.makeRequest('put', `variants/${id}.json`, { variant })
      .then(accessProperty('variant'))
      .catch(error => {
        console.log(error);
      });
  }

  createRecurringApplicationCharge(charge) {
    return this.makeRequest(
      'post',
      'recurring_application_charges.json',
      charge
    )
      .then(accessProperty('recurring_application_charge'))
      .catch(error => {
        console.log(error);
      });
  }

  customizeRecurringApplicationCharge(id, cappedAmount) {
    const url = `recurring_application_charges/${id}/customize.json`;
    const request = {
      recurring_application_charge: {
        capped_amount: cappedAmount
      }
    };
    return this.makeRequest('put', url, request).then(
      accessProperty('recurring_application_charge')
    );
  }

  listRecurringApplicationCharges() {
    const url = `recurring_application_charges.json`;
    return this.makeRequest('get', url).then(
      accessProperty('recurring_application_charges')
    );
  }

  getRecurringApplicationCharge(chargeId) {
    const url = `recurring_application_charges/${chargeId}`;
    return this.makeRequest('get', url).then(
      accessProperty('recurring_application_charge')
    );
  }

  activateRecurringApplicationCharge(chargeId) {
    const url = `recurring_application_charges/${chargeId}/activate.json`;
    return this.makeRequest('post', url);
  }

  cancelRecurringApplicationCharge(chargeId) {
    const url = `recurring_application_charges/${chargeId}.json`;
    return this.makeRequest('delete', url);
  }

  createUsageCharge(recurringApplicationChargeId, name, amount) {
    const url = `recurring_application_charges/${recurringApplicationChargeId}/usage_charges.json`;

    const usageCharge = {
      usage_charge: {
        description: name,
        price: amount
      }
    };

    return this.makeRequest('post', url, usageCharge).then(
      accessProperty('usage_charge')
    );
  }

  getScriptTags() {
    const url = 'script_tags.json';
    return this.makeRequest('get', url).then(accessProperty('script_tags'));
  }

  deleteScriptTag(id) {
    const url = `script_tags/${id}.json`;
    return this.makeRequest('delete', url);
  }

  setSingleScriptTag(url) {
    const needToCreate = true;
    return this.getScriptTags().then(scriptTags => {
      const requestPromises = scriptTags.map(scriptTag => {
        if (scriptTag.src === url) {
          needToCreate = false;
          return null;
        } else {
          return this.deleteScriptTag(scriptTag.id);
        }
      });

      if (needToCreate) {
        requestPromises.push(this.createScriptTag(url));
      }

      return Promise.all(requestPromises);
    });
  }

  createScriptTag(src) {
    const url = 'script_tags.json';
    const requestData = {
      script_tag: {
        event: 'onload',
        src: src
      }
    };
    return this.makeRequest('post', url, requestData);
  }

  getWebhooks() {
    return this.makeRequest('get', 'webhooks.json').then(
      accessProperty('webhooks')
    );
  }

  createWebhook(topic, address) {
    const requestData = {
      webhook: {
        topic: topic,
        address: address,
        format: 'json'
      }
    };
    return this.makeRequest('post', 'webhooks.json', requestData);
  }

  deleteWebhook(id) {
    const url = `webhooks/${id}.json`;
    return this.makeRequest('delete', url);
  }

  deleteAllWebhooks() {
    const _this = this;
    const deletionPromises = this.getWebhooks().map(function(webhook) {
      return _this.deleteWebhook(webhook.id);
    });

    return Promise.all(deletionPromises);
  }

  setWebhooks(desiredWebhooks) {
    return this.deleteAllWebhooks().then(() => {
      const creationPromises = desiredWebhooks.map(webhook => {
        return this.createWebhook(webhook.topic, webhook.address);
      });

      return Promise.all(creationPromises);
    });
  }

  uninstallApp() {
    return this.makeRequest('delete', 'api_permissions/current.json');
  }

  getOrders(fields) {
    // TODO make this return only what's necessary
    const requestData = {
      limit: 250,
      // fields: 'financial_status,total_price,currency', // TODO line_items
      // 'created_at_min': '2016-08-01T00:00-4:00',
      status: 'any'
    };

    Object.assign(requestData, fields);
    return this.makeRequest('get', 'orders.json', requestData).then(
      accessProperty('orders')
    );
  }
};
