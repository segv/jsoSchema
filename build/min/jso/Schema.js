define([],function(){var l;return l=function(c){return{Every:c.g,And:c.b,Any:c.j,Or:c.i,If:c.A,OfType:c.d,Condition:c.a,Number:c.c,Integer:c.B,GreaterThan:c.u,GreaterThanEqual:c.v,LessThan:c.C,LessThanEqual:c.D,String:c.n,Boolean:c.r,Test:c.H,Enum:c.s,OneOf:c.l,Constant:c.k,Object:function(f){return c.h({o:f.required_properties,J:f.optional_properties,e:f.allow_other_properties})},Record:c.G,HashTable:c.w,Array:c.q,Tuple:c.I,Nullable:c.F,Pass:c.m,Fail:c.t,violatesSchema:function(f,a){var b=c.p(f,
a);return!1==b?!1:{value:b.value,schema:b.L,message:b.message}},validate:c.K}}(function(){function c(b,d){for(var a in b)b.hasOwnProperty(a)&&d(b[a],a)}function f(b){var d=[];c(b,function(b,a){d.push(a)});return d}var a={K:function(b,d){return!1==a.p(b,d)?!0:!1},p:function(b,d){var a=void 0,c=!1;d(b,function(){c=!0},function(){a={value:b,schema:d,message:[].concat(arguments)}});return c?!1:a},b:function(b){return a.g([].slice.call(arguments,0))},g:function(b){return function(a,c,e){function k(g){if(g==
b.length)c();else b[g](a,function(){k(g+1)},e)}k(0)}},i:function(b){return a.j([].slice.call(arguments,0))},j:function(b){return function(a,c,e){function k(g){if(g==b.length)e();else b[g](a,c,function(){k(1+g)})}k(0)}},A:function(b,d,c){return a.i(a.b(b,d),c)},a:function(b){return function(a,c,e){return b(a)?c():e(a," did not return true from ",b)}},f:function(b){var a=typeof b;if("object"===a)if(b){if("[object Array]"==Object.prototype.toString.call(b))return"array"}else return"null";return a},d:function(b){return a.a(function(c){return a.f(c)==
b})},c:function(){return a.d("number")},u:function(b){return a.b(a.c(),a.a(function(a){return b<a}))},v:function(b){return a.b(a.c(),a.a(function(a){return b<=a}))},C:function(b){return a.b(a.c(),a.a(function(a){return a<b}))},D:function(b){return a.b(a.c(),a.a(function(a){return a<=b}))},B:function(){return a.b(a.c(),a.a(function(a){return 0==a%1}))},n:function(){return a.d("string")},r:function(){return a.d("boolean")},H:function(b){"string"==a.f(b)&&(b=RegExp(b));return a.b(a.n(),a.a(function(a){return null!=
b.exec(a)}))},l:function(b){var c={},h;for(h=0;h<b.length;h++)c[b[h]]=!0;return a.a(function(a){return c.hasOwnProperty(a)})},s:function(b){return a.l([].slice.call(arguments,0))},k:function(b){return a.a(function(a){return a===b})},h:function(b){var d=[],h=b.o||{};c(h,function(a,b){d.push(function(c,d,e){c.hasOwnProperty(b)?a(c[b],d,e):e()})});var e=b.J||{};c(e,function(a,b){d.push(function(c,d,e){c.hasOwnProperty(b)?a(c[b],d,e):d()})});"undefined"===a.f(b.e)||b.e||d.push(a.a(function(a){var b={};
c(a,function(a,c){b[c]=!0});c(h,function(a,c){delete b[c]});c(e,function(a,c){delete b[c]});return 0==f(b).length}));return a.g(d)},G:function(b){return a.h({o:b,e:!1})},w:function(){return a.h({e:!0})},q:function(b,c){if(0==arguments.length)throw Error("Missing required argument item_schema");"undefined"==a.f(c)&&(c=a.m());return a.b(a.d("array"),function(a,b,k){c(a.length,b,k)},function(a,c,d){function g(f){f==a.length?c():b(a[f],function(){g(f+1)},d)}g(0)})},I:function(b){b=[].slice.call(arguments,
0);return a.b(a.d("array"),function(a,c,e){if(b.length!=a.length)e("Wrong number f elements in tuple",a,"expected",b.length);else{var f=function(g){if(a.length==g)c();else b[g](a[g],function(){f(g+1)},e)};f(0)}})},F:function(b){return a.i(a.k(null),b)},m:function(){return function(a,c){return c()}},t:function(){var a=[].slice.call(arguments,0);return function(c,f,e){return e.apply(e,a)}}};return a}())});
