(function(n){var m;m=function(c){return{Every:c.g,And:c.b,Any:c.j,Or:c.i,If:c.B,OfType:c.d,Condition:c.a,Number:c.c,Integer:c.C,GreaterThan:c.v,GreaterThanEqual:c.w,LessThan:c.D,LessThanEqual:c.F,String:c.n,Boolean:c.s,Test:c.I,Enum:c.t,OneOf:c.l,Constant:c.k,Object:function(d){return c.h({p:d.required_properties,o:d.optional_properties,f:d.allow_other_properties})},Record:c.H,HashTable:c.A,Array:c.r,Tuple:c.J,Nullable:c.G,Pass:c.m,Fail:c.u,violatesSchema:function(d,l){var a=c.q(d,l);return!1==a?
!1:{value:a.value,schema:a.L,message:a.message}},validate:c.K}}(function(){function c(b){return[].slice.call(b,0)}function d(b,f){for(var a in b)b.hasOwnProperty(a)&&f(b[a],a)}function l(b){var f=[];d(b,function(b,a){f.push(a)});return f}var a={K:function(b,f){return!1==a.q(b,f)?!0:!1},q:function(b,a){var e=void 0,h=!1;a(b,function(){h=!0},function(){e={value:b,schema:a,message:c(arguments)}});return h?!1:e},b:function(b){return a.g(c(arguments))},g:function(b){return function(a,c,h){function k(g){if(g==
b.length)c();else b[g](a,function(){k(g+1)},h)}k(0)}},i:function(b){return a.j(c(arguments))},j:function(b){return function(a,c,h){function k(g){if(g==b.length)h();else b[g](a,c,function(){k(1+g)})}k(0)}},B:function(b,f,c){return a.i(a.b(b,f),c)},a:function(b){return function(a,c,h){return b(a)?c():h(a," did not return true from ",b)}},e:function(b){var a=typeof b;if("object"===a)if(b){if("[object Array]"==Object.prototype.toString.call(b))return"array"}else return"null";return a},d:function(b){return a.a(function(c){return a.e(c)==
b})},c:function(){return a.d("number")},v:function(b){return a.b(a.c(),a.a(function(a){return b<a}))},w:function(b){return a.b(a.c(),a.a(function(a){return b<=a}))},D:function(b){return a.b(a.c(),a.a(function(a){return a<b}))},F:function(b){return a.b(a.c(),a.a(function(a){return a<=b}))},C:function(){return a.b(a.c(),a.a(function(a){return 0==a%1}))},n:function(){return a.d("string")},s:function(){return a.d("boolean")},I:function(b){"string"==a.e(b)&&(b=RegExp(b));return a.b(a.n(),a.a(function(a){return null!=
b.exec(a)}))},l:function(b){var c={},e;for(e=0;e<b.length;e++)c[b[e]]=!0;return a.a(function(a){return c.hasOwnProperty(a)})},t:function(b){return a.l(c(arguments))},k:function(b){return a.a(function(a){return a===b})},h:function(b){var c=[],e=b.p||{};d(e,function(a,b){c.push(function(c,f,e){c.hasOwnProperty(b)?a(c[b],f,e):e()})});var h=b.o||{};d(h,function(a,b){c.push(function(c,f,e){c.hasOwnProperty(b)?a(c[b],f,e):f()})});"undefined"===a.e(b.f)||b.f||c.push(a.a(function(a){var b={};d(a,function(a,
c){b[c]=!0});d(e,function(a,c){delete b[c]});d(h,function(a,c){delete b[c]});return 0==l(b).length}));return a.g(c)},H:function(b,c,e){return a.h({p:b,o:c||{},f:"undefined"===a.e(e)?!1:e})},A:function(){return a.h({f:!0})},r:function(b,c){if(0==arguments.length)throw Error("Missing required argument item_schema");"undefined"==a.e(c)&&(c=a.m());return a.b(a.d("array"),function(a,b,d){c(a.length,b,d)},function(a,c,f){function g(d){d==a.length?c():b(a[d],function(){g(d+1)},f)}g(0)})},J:function(b){b=
c(arguments);return a.b(a.d("array"),function(a,c,d){if(b.length!=a.length)d("Wrong number f elements in tuple",a,"expected",b.length);else{var k=function(g){if(a.length==g)c();else b[g](a[g],function(){k(g+1)},d)};k(0)}})},G:function(b){return a.i(a.k(null),b)},m:function(){return function(a,c){return c()}},u:function(){var a=c(arguments);return function(c,d,h){return h.apply(h,a)}}};return a}());n.fn.jsoSchema=m})(jQuery);
