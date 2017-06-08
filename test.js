
require('dotenv').config()

const shopifyClient = require('./client.js');


var ShopifyClient = new shopifyClient({
    'hostname': process.env.SHOPIFY_HOSTNAME,
    'accessToken': process.env.SHOPIFY_ACCESS_TOKEN
    });

//ShopifyClient.getShop();

function multipleShopifyCalls(numberOfCalls) {
    for (var i = 0; i < numberOfCalls; i++) {
        //setTimeout(function () {
        //    ShopifyClient.getShop()
        //}, 100 * i)
        ShopifyClient.getShop();
    }
}

multipleShopifyCalls(10);