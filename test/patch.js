var Q = require('q');
var path = require('path');
var _ = require('lodash');

var patch = require('../lib/utils/patch');

describe('Patch', function() {

    it('should correctly parse a patch', function() {
        var r = patch.parse("@@ -13,7 +13,7 @@\n         \"fs-extra\": \"0.16.5\",\n         \"fstream-ignore\": \"1.0.2\",\n         \"gitbook-parsers\": \"0.7.7\",\n-        \"nunjucks\": \"mozilla/nunjucks#103513c294835bcbe64222de6db494e2555e294e\",\n+        \"nunjucks\": \"2.0.0\",\n         \"nunjucks-autoescape\": \"1.0.0\",\n         \"nunjucks-filter\": \"1.0.0\",\n         \"i18n\": \"0.5.0\",");
        r.additions.should.equal(1);
        r.deletions.should.equal(1);
    });

});