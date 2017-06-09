
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
function makeAProduct(title, body_html, vendor, product_type) {
    var product = {
        title: title,
        body_html: body_html,
        vendor: vendor,
        product_type: product_type,
        published: false
    };
    return product
};

//POST product

ShopifyClient.createProduct(makeAProduct("ESO fancy hats", "Wear a hat vestige!", "the Prophet", "hat"))
    //Fetch newly created object
    //GET product
    //.then(res => { console.log(res.id, "post product id"); return ShopifyClient.getProduct(res.id) })
    //.then(res => { console.log(res.id, "get product id"); ShopifyClient.deleteProduct(res.id); return res.id })
    //.then(res => { console.log(res, "id of deleted product"); ShopifyClient.getProducts(); ShopifyClient.getProduct(res) })
    //.catch(err => {
    //    console.log(err)
    //})


//ShopifyClient.getProducts();

//Delete newly create object
ShopifyClient.deleteProduct(9679840897).then(() => { ShopifyClient.getProducts() })

//Confirm deletion, fetch
