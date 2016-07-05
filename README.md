Shazbot!
========
A amazon product API wrapper I built because the other active ones I tried didn't work for the EAN/UPC lookups I needed, this may expand or stay a small library.

Usage
-----

First get an instance of the library
    
    var AmazonProductAPI = require('shazbot');
    var api = new AmazonProductAPI({
    	AWSAccessKeyId: '<your key>',
        AWSSecret: '<your secret>',
        AssociateTag: '<your associate id>'
    });
    
Then make requests

    api.lookup({
    	itemId : options.upc,
        searchIndex: 'All',
        idType:'UPC'
    }, function(err, results){
    	//results, in a - delimited format
    })
    

All fields are named from the API and may be delivered in a variety of case/delimeter formats (`LikeThis`, `likeThis`, `Like-This`, `like-This`, `Like-this`, `like-this`, `Like_This`, `like_This`, `Like_this`, `like_this`, `Like This`, `like This`, `Like this`, `like this`), so it should chew through whatever label format you throw at it. 

To change the delimiter for the output format just set it on the instance:

	api.delimiter = '_';

That is all.

Testing
-------
I didn't write tests because of the need to have either working amazon credentials or a mock of it. That would be a first step if you want to write them.

If you find any rough edges, please submit a bug!

Enjoy,

-Abbey Hawk Sparrow