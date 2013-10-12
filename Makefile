all: build/jquery.jsoSchema.js build/jsoSchema.js

clean:
	rm -rf build

build/raw/jquery.jsoSchema.js: jsoSchema.js
	mkdir -p build/raw
	echo "(function (jQuery) { " > $@
	cat ./jsoSchema.js >> $@
	echo >> $@
	echo "jQuery.fn.jsoSchema = jsoSchema;" >> $@
	echo "})(jQuery);" >> $@

build/raw/jso/Schema.js: jsoSchema.js
	mkdir -p build/raw/jso/
	echo "define([ ], function () { " > $@
	cat ./jsoSchema.js >> $@
	echo >> $@
	echo "return jsoSchema;" >> $@
	echo "});" >> $@

.PHONY: test

test:
	make build/min/jso/Schema.js
	nodejs ./test/test.js

build/compiler.jar:
	mkdir -p build
	wget "http://dl.google.com/closure-compiler/compiler-latest.zip" -O build/compiler-latest.zip
	(cd build && unzip compiler-latest.zip compiler.jar && rm compiler-latest.zip)

JS_COMPILE=java -jar build/compiler.jar --externs jsoSchema_externs.js --compilation_level ADVANCED_OPTIMIZATIONS --warning_level=VERBOSE --js jsoSchema_types.js

build/min/jso/Schema.js: jsoSchema.js jsoSchema_externs.js jsoSchema_types.js build/compiler.jar build/raw/jso/Schema.js
	mkdir -p build/min/jso/
	$(JS_COMPILE)  --js build/raw/jso/Schema.js --js_output_file build/min/jso/Schema.js 2>&1

build/min/jquery.jsoSchema.js: jsoSchema.js jsoSchema_externs.js jsoSchema_types.js build/compiler.jar build/raw/jquery.jsoSchema.js
	mkdir -p build/min/
	$(JS_COMPILE)  --js build/raw/jquery.jsoSchema.js --js_output_file build/min/jquery.jsoSchema.js 2>&1

compile: build/min/jso/Schema.js build/min/jquery.jsoSchema.js
