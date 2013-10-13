SRC=src
RAW=build/raw
MIN=build/min

test: node_modules/requirejs node_modules/buster build/min/jso/Schema.js
	nodejs ./test/test.js

$(RAW)/jquery.jsoSchema.js: $(SRC)/jsoSchema.js
	mkdir -p $(dir $@)
	echo "(function (jQuery) { " > $@
	cat $< >> $@
	echo >> $@
	echo "jQuery.fn.jsoSchema = jsoSchema;" >> $@
	echo "})(jQuery);" >> $@

$(RAW)/jso/Schema.js: $(SRC)/jsoSchema.js
	mkdir -p $(dir $@)
	echo "define([ ], function () { " > $@
	cat $< >> $@
	echo >> $@
	echo "return jsoSchema;" >> $@
	echo "});" >> $@

.PHONY: test

node_modules/%:
	npm install $(notdir $@)

build/compiler.jar:
	mkdir -p build
	wget "http://dl.google.com/closure-compiler/compiler-latest.zip" -O build/compiler-latest.zip
	(cd build && unzip compiler-latest.zip compiler.jar && rm compiler-latest.zip)

JS_COMPILE=java -jar build/compiler.jar --externs $(SRC)/jsoSchema_externs.js --compilation_level ADVANCED_OPTIMIZATIONS --warning_level=VERBOSE --js $(SRC)/jsoSchema_types.js

$(MIN)/jso/Schema.js: build/raw/jso/Schema.js build/compiler.jar 
	mkdir -p $(dir $@)
	$(JS_COMPILE) --js build/raw/jso/Schema.js --js_output_file build/min/jso/Schema.js 2>&1

$(MIN)/jquery.jsoSchema.js: build/raw/jquery.jsoSchema.js build/compiler.jar 
	mkdir -p $(dir $@)
	$(JS_COMPILE)  --js build/raw/jquery.jsoSchema.js --js_output_file build/min/jquery.jsoSchema.js 2>&1

compile: $(MIN)/jso/Schema.js $(MIN)/jquery.jsoSchema.js

clean:
	rm -rf build node_modules

build/README.html: README.asciidoc
	mkdir -p $(dir $@)
	asciidoc -o $@ README.asciidoc 

doc: build/README.html
