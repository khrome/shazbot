var request = require('request');
var crypto = require('crypto');
var parseXML = require('xml2js').parseString;

function JSStringFromCamelString(string, delimiter){
    var copy = '';
    var lastCharWasUpper = false;
    for(var lcv = 0; lcv < string.length; lcv++){
        if(string[lcv].toLowerCase() !== string[lcv]){
            if(lcv == 0 || lastCharWasUpper) copy += string[lcv].toLowerCase();
            else copy += (delimiter || '-')+string[lcv].toLowerCase();
            lastCharWasUpper = true;
        }else{
            lastCharWasUpper = false;
            copy += string[lcv];
        }
    }
    return copy;
}

function JSParamsFromCamel(object, delimiter){
    if(typeof object == 'object' && !Array.isArray(object)){
        var cloned = {};
        Object.keys(object).forEach(function(key){
            cloned[JSStringFromCamelString(key, delimiter)] = JSParamsFromCamel(object[key]);
        });
        return cloned;
    }
    if(Array.isArray(object)){
        return object.map(function(item){
            return JSParamsFromCamel(item);
        });
    }
    return object;
}

function AmazonProductAPI(creds){
    this.creds = creds;
    this.delimiter = '-';
}

function CamelParamsFromJS(options){
    var opts = {};
    Object.keys(options).forEach(function(name){
        var mapped = name.split(/[ _-]+/g).map(function(value){
            return value[0]?value[0].toUpperCase()+value.substring(1):value;
        }).join('');
        opts[mapped] = options[name];
    });
    return opts;
}

function alias(functionName, operationName, handler){
    AmazonProductAPI.prototype[functionName] = function(options, callback){
        return this.operate(operationName, options, handler?function(err, res){
            return callback(err, res?handler(res):res);
        }:callback);
    }
}

alias('lookup', 'ItemLookup', function(results){
    var result = {};
    var attrs = results.item[0]['item-attributes'][0];
    if(attrs.author) result.author = attrs.author.join(",");
    if(attrs.director) result.director = attrs.director.join(",");
    if(attrs.actor) result.cast = attrs.actor.join(",");
    if(attrs.creator){
    var creator = attrs.creator[0]['_'];
    result.creator = attrs.creator[0]['$'];
    result.creator.name = creator;
    result.creator = [result.creator];
    };
    if(attrs.manufacturer) result.manufacturer = attrs.manufacturer[0];
    if(attrs['product-group']) result['product-group'] = attrs['product-group'][0];
    if(attrs.title) result.title = attrs.title[0];
    if(results.creator) result.creator = results.creator.map(function(creator){
      return {name:creator._, information: creator['$']};
    });
    result.asin = results.item[0]['asin'][0];
    result.links = results.item[0]['item-links'][0]['item-link'].map(function(link){
      return {
            name: link.description[0],
            url: link.url[0]
      };
    });
    result.url = results.item[0]['detail-page-url'];
    return result;
});
alias('search', 'ItemSearch');


AmazonProductAPI.prototype.operate = function(name, options, callback){
    options.operation = name;
    var ob = this;
    Object.keys(this.creds).forEach(function(key){
        options[key] = ob.creds[key];
    })
    options['timestamp'] = new Date().toISOString();
    options['service'] = 'AWSECommerceService';
    var list = CamelParamsFromJS(options);
    var domain = options.domain || 'webservices.amazon.com';
    
    // generate query
    var unsignedString = Object.keys(list).sort().map(function (key) {
        return key + "=" + encodeURIComponent(list[key]).replace(/[!'()*]/g, function(c) {
          return '%' + c.charCodeAt(0).toString(16);
        });
    }).join("&");
    
    //sign query
    var hmac = crypto.createHmac('sha256', this.creds.AWSSecret);
    var signable = 'GET\n' + domain + '\n/onca/xml\n' + unsignedString;
    var signature = encodeURIComponent(hmac.update(signable).digest('base64')).replace(/\+/g, '%2B');
    var queryString = 'http://' + domain + '/onca/xml?' + unsignedString + '&Signature=' + signature;
    
    //perform query
    request(queryString, function (err, response, body) {
        if (err) {
          return callback(err);
        }else if(!response){
          return callback(new Error("No response (check internet connection)"));
        }else if(response.statusCode !== 200){
          parseXML(body, function (err, resp) {
            return callback(err || new Error(resp[name + 'ErrorResponse']) );
          });
        }else{
          parseXML(body, function (err, resp) {
              if(err) return callback(err);
              var found;
              var dashed = JSParamsFromCamel(resp, ob.delimiter);
              var respName = JSStringFromCamelString(name, ob.delimiter)+ob.delimiter+'response';
              var response = dashed[respName].items[0];
              if(response.errors) return callback(response.errors);
              return callback(undefined, response);
          });
        }
    });

}
module.exports = AmazonProductAPI;