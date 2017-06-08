/**
 * Shopify Client
 * Author: Marek Zaluski <marekz@gmail.com>
 *
 * This is a client library for the Shopify REST API.
 *
 * Development status: in progress
*/

'use strict';


var Promise = require('bluebird');
const got = require('got');
var CheckOptions = require('check-options');
var Promise = require("bluebird");
var debug = require('debug')('shopify-client');

// Utility function to get a particular property, used with .then()
function accessProperty(property) {
    return function (object) {
        //console.log(object)
        if (!Object.prototype.hasOwnProperty.call(object, property)) {
            throw new Error(`No such property to access: ${property}, only: ${Object.keys(object)}`);
        }
        return object[property];
    };
}


module.exports = class ShopifyClient {
    constructor(options) {
        CheckOptions(options, ['hostname', 'accessToken']);

        let { hostname, accessToken } = options;

        this.hostname = hostname;
        this.accessToken = accessToken;
    }

    makeRequest(method, path, data = {}) {
        method = method.toUpperCase();

        var url = `https://${this.hostname}/admin/${path}`;

        debug(`${method} ${url}`);


        //amount of milliseconds to delay promise chain
        var delayMilliSecs = 0;

        var requestOptions = {
            method: method,
            //url: url,
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': this.accessToken
            },
            json: true,
            resolveWithFullResponse: true
        };

        if (method === 'POST' || method === 'PUT') {
            requestOptions.body = data;
        } else {
            requestOptions.qs = data;
        }
       
        
       return got(url, requestOptions)
            .then(response => {
                //console.log(response.body, "the got response")
                debug(response.requestUrl);

                //console.log(response.statusCode);
                console.log(response.headers['x-shopify-shop-api-call-limit'])
                var callLimit = response.headers['x-shopify-shop-api-call-limit'];


                if (callLimit) {
                    callLimit = parseInt(callLimit.split('/'));

                    if (callLimit >= 40) {
                        delayMilliSecs = 500;
                    }
                }

                debug('Call Limit: ' + callLimit);
                console.log(callLimit, delayMilliSecs)

                return Promise.delay(delayMilliSecs).then(() => { return response.body})

            })
            .then(res => {
                //console.log(res, "response")
                return res;
            })
            
            


        

        //return request(requestOptions).then(response => {
        //    // debug(response.request.uri.href);

        //    var callLimit = response.headers['x-shopify-shop-api-call-limit'];
        //    if (callLimit) {
        //        callLimit = parseInt(callLimit.split('/'));
        //    }
        //    debug('Call Limit: ' + callLimit);
        //    return response.body;
        //});
    }

    makeRequestWithRetry(method, path, data = {}) {
        // Create a function that we can call recursively
        var that = this;
        //console.log(this.makeRequest)
        function tryRequest() {
            
            //console.log(that.makeRequest)
            return that.makeRequest(method, path, data = {}).catch(err => {
                if (err.response.statusCode === 429) {
                    return Promise.delay(500).then(tryRequest);
                }
                throw err; // If it's not 429 then propagate the error
            });
        }

        // Start the attempt
        return tryRequest();
    }
    

    getShop() {
        return this.makeRequestWithRetry('get', 'shop.json').then(accessProperty('shop')).catch(error => {console.log(error);});
    }


    getProducts(options) {
        return this.makeRequest('get', 'products.json', options).then(accessProperty('products'));
    }

    getProduct(id) {
        return this.makeRequest('get', `products/${id}.json`).then(accessProperty('product'));
    }

    createProduct(product) {
        return this.makeRequest('post', `products.json`, { product }).then(accessProperty('product'));
    }

    updateProduct(id, product) {
        return this.makeRequest('put', `products/${id}.json`, { product }).then(accessProperty('product'));
    }

    getProductVariant(id) {
        return this.makeRequest('get', `variants/${id}.json`).then(accessProperty('variant'));
    }

    updateProductVariant(id, variant) {
        return this.makeRequest('put', `variants/${id}.json`, { variant }).then(accessProperty('variant'));
    }

    createRecurringApplicationCharge(charge) {
        return this.makeRequest('post', 'recurring_application_charges.json', charge).then(accessProperty('recurring_application_charge'));
    }

    customizeRecurringApplicationCharge(id, cappedAmount) {
        const url = `recurring_application_charges/${id}/customize.json`;
        const request = {
            recurring_application_charge: {
                capped_amount: cappedAmount
            }
        };
        return this.makeRequest('put', url, request).then(accessProperty('recurring_application_charge'));
    }

    listRecurringApplicationCharges() {
        var url = `recurring_application_charges.json`;
        return this.makeRequest('get', url).then(accessProperty('recurring_application_charges'));
    }

    getRecurringApplicationCharge(chargeId) {
        var url = `recurring_application_charges/${chargeId}`;
        return this.makeRequest('get', url).then(accessProperty('recurring_application_charge'));
    }

    activateRecurringApplicationCharge(chargeId) {
        var url = `recurring_application_charges/${chargeId}/activate.json`;
        return this.makeRequest('post', url);
    }

    cancelRecurringApplicationCharge(chargeId) {
        var url = `recurring_application_charges/${chargeId}.json`;
        return this.makeRequest('delete', url);
    }

    createUsageCharge(recurringApplicationChargeId, name, amount) {
        var url = `recurring_application_charges/${recurringApplicationChargeId}/usage_charges.json`;

        var usageCharge = {
            usage_charge: {
                description: name,
                price: amount
            }
        };

        return this.makeRequest('post', url, usageCharge).then(accessProperty('usage_charge'));
    }

    getScriptTags() {
        var url = 'script_tags.json';
        return this.makeRequest('get', url).then(accessProperty('script_tags'));
    }

    deleteScriptTag(id) {
        var url = `script_tags/${id}.json`;
        return this.makeRequest('delete', url);
    }

    setSingleScriptTag(url) {
        var needToCreate = true;
        return this.getScriptTags().then(scriptTags => {
            var requestPromises = scriptTags.map(scriptTag => {
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
        var url = 'script_tags.json';
        var requestData = {
            script_tag: {
                event: 'onload',
                src: src
            }
        };
        return this.makeRequest('post', url, requestData);
    }

    getWebhooks() {
        return this.makeRequest('get', 'webhooks.json').then(accessProperty('webhooks'));
    }

    createWebhook(topic, address) {
        var requestData = {
            webhook: {
                topic: topic,
                address: address,
                format: 'json'
            }
        };
        return this.makeRequest('post', 'webhooks.json', requestData);
    }

    deleteWebhook(id) {
        var url = `webhooks/${id}.json`;
        return this.makeRequest('delete', url);
    }

    deleteAllWebhooks() {
        var _this = this;
        var deletionPromises = this.getWebhooks().map(function (webhook) {
            return _this.deleteWebhook(webhook.id);
        });

        return Promise.all(deletionPromises);
    }

    setWebhooks(desiredWebhooks) {
        return this.deleteAllWebhooks().then(() => {
            var creationPromises = desiredWebhooks.map(webhook => {
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
        var requestData = {
            limit: 250,
            // fields: 'financial_status,total_price,currency', // TODO line_items
            // 'created_at_min': '2016-08-01T00:00-4:00',
            status: 'any'
        };

        Object.assign(requestData, fields);
        return this.makeRequest('get', 'orders.json', requestData).then(accessProperty('orders'));
    }
};
