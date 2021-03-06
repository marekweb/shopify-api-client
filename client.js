const { get, differenceWith } = require('lodash');
const got = require('got');
const checkOptions = require('check-options');
const Promise = require('bluebird');
const debug = require('debug')('shopify-api-client');

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
      }

      debug('Call Limit: ' + callLimit);

      return response.body;
    });
  }

  makeRequestWithRetry(method, path, data = {}) {
    // Create a function that we can call recursively
    const tryRequest = () => {
      return this.makeRequest(method, path, (data = {})).catch(err => {
        const statusCode = get(err, 'response.statusCode');
        if (statusCode) {
          debug(`${statusCode} ${response.requestUrl}`);
        }
        if (statusCode === 429) {
          return Promise.delay(500).then(tryRequest);
        }
        throw err;
      });
    };

    return tryRequest();
  }

  static obtainOauthAccessToken(clientId, clientSecret, hostname, code) {
    let url = `https://${hostname}/admin/oauth/access_token`;
    const requestOptions = {
      method: 'post',
      json: true,
      body: {
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      }
    };
    debug('POST', url);
    return got(url, requestOptions).then(
      response => response.body.access_token
    );
  }

  getShop() {
    return this.makeRequestWithRetry('get', 'shop.json').then(
      accessProperty('shop')
    );
  }

  getProducts(options) {
    return this.makeRequest('get', 'products.json', options).then(
      accessProperty('products')
    );
  }

  getProduct(id) {
    return this.makeRequest('get', `products/${id}.json`).then(
      accessProperty('product')
    );
  }

  createProduct(product) {
    return this.makeRequest('post', `products.json`, { product }).then(
      accessProperty('product')
    );
  }

  updateProduct(id, product) {
    return this.makeRequest('put', `products/${id}.json`, { product }).then(
      accessProperty('product')
    );
  }

  deleteProduct(id) {
    return this.makeRequest('delete', `products/${id}.json`);
  }

  getProductVariant(id) {
    return this.makeRequest('get', `variants/${id}.json`).then(
      accessProperty('variant')
    );
  }

  updateProductVariant(id, variant) {
    return this.makeRequest('put', `variants/${id}.json`, { variant }).then(
      accessProperty('variant')
    );
  }

  createRecurringApplicationCharge(charge) {
    return this.makeRequest(
      'post',
      'recurring_application_charges.json',
      charge
    ).then(accessProperty('recurring_application_charge'));
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

  createWebhook(webhook) {
    return this.makeRequest('post', 'webhooks.json', { webhook });
  }

  deleteWebhook(id) {
    const url = `webhooks/${id}.json`;
    return this.makeRequest('delete', url);
  }

  deleteAllWebhooks() {
    const deletionPromises = this.getWebhooks().then(webhooks => {
      return Promise.map(webhooks, webhook => {
        return this.deleteWebhook(webhook.id);
      });
    });
    return deletionPromises;
  }

  /**
   *
   * @param {Array.<{topic: string, address: string}>} desiredWebhooks
   * @return {Promise<{creations: Array, deletions: Array}>}
   */
  setWebhooks(desiredWebhooks) {
    return this.getWebhooks().then(webhooks => {
      const webhooksToBeDeleted = differenceWith(
        webhooks,
        desiredWebhooks,
        compareWebhooks
      );
      const webhooksToBeCreated = differenceWith(
        desiredWebhooks,
        webhooks,
        compareWebhooks
      );

      return Promise.props({
        creations: Promise.map(webhooksToBeCreated, webhook =>
          this.createWebhook(webhook)
        ),
        deletions: Promise.map(webhooksToBeDeleted, webhook =>
          this.deleteWebhook(webhook.id)
        )
      });
    });
  }

  uninstallApp() {
    return this.makeRequest('delete', 'api_permissions/current.json');
  }

  getOrders(fields) {
    return this.makeRequest('get', 'orders.json', fields).then(
      accessProperty('orders')
    );
  }
};

function compareWebhooks(a, b) {
  return a.topic === b.topic && a.address === b.address;
}
