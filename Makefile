all: build/jquery.jsoSchema.js build/jsoSchema.js

clean:
	rm -rf build

build: build/jquery/jquery.jsoSchema.js

build/jquery/jquery.jsoSchema.js: jsoSchema.js
	mkdir -p build/jquery
	echo "(function (jQuery) { " > $@
	cat ./jsoSchema.js >> $@
	echo >> $@
	echo "jQuery.fn.jsoSchema = jsoSchema;" >> $@
	echo "})(jQuery);" >> $@

build/requirejs/jso/Schema.js: jsoSchema.js
	mkdir -p build/requirejs/jso
	echo "define([ ], function () { " >> $@
	cat ./jsoSchema.js >> $@
	echo >> $@
	echo "return jsoSchema;" >> $@
	echo "});" >> $@

test: clean build/requirejs/jso/Schema.js
	nodejs ./test/test.js
