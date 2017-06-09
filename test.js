
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
//ShopifyClient.getShop();

//Create an object
var product = {
    title: "Burton Custom Freestyle 151",
    body_html: "<strong>Good snowboard!<\/strong>",
    vendor: "Burton",
    product_type: "Snowboard",
    published: false
};
    //POST product
ShopifyClient.createProduct(product);

//Fetch newly created object
    //GET product
//ShopifyClient.getProducts();

//Delete newly create object

//Confirm deletion, fetch
