
require('dotenv').config()

const shopifyClient = require('./client.js');


var ShopifyClient = new shopifyClient({
    'hostname': process.env.SHOPIFY_HOSTNAME,
    'accessToken': process.env.SHOPIFY_ACCESS_TOKEN
    });


//Makes multiple calls to the shopify API
//Used to test call limit quantity and frequency
function multipleShopifyCalls(numberOfCalls) {
    for (var i = 0; i < numberOfCalls; i++) {
        //can set a timeout function to any interval between calls

        //setTimeout(function () {
        //    ShopifyClient.getShop()
        //}, 100 * i)

        //use the getShop function to do a general get request
        ShopifyClient.getShop();
    }
}

//multipleShopifyCalls(41);

//GET shop
ShopifyClient.getShop();