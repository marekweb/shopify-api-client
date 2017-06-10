
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
        //Fetch newly created object && show list of other products
//GET product
    .then(res => { ShopifyClient.getProducts(); return ShopifyClient.getProduct(res.id) })
//Delete newly create object
        //the delete request returns an empty object
    .then(res => { return ShopifyClient.deleteProduct(res.id) })
//Confirm deletion, GET product
        //trying to look up the new product results in an error, since it is deleted
//GET products
        //show list of products, new product is no longer there
    .then(() => { ShopifyClient.getProducts();})
    .catch(err => {
        console.log(err)
    })

function massiveDeleteWithIds(arrayOfIds) {
    arrayOfIds.map(function (id) {
        ShopifyClient.deleteProduct(id)
    })
}





