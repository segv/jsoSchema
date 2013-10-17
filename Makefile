SRC=src
RAW=build/raw
MIN=build/min

test: node_modules/requirejs node_modules/buster build/min/jso/Schema.js
	nodejs ./test/test.js
	nodejs ./test/examples.js

$(RAW)/jquery.jsoSchema.js: $(SRC)/jsoSchema.js
	mkdir -p $(dir $@)
	echo "(function (jQuery) { " > $@
	cat $< >> $@
	echo >> $@
	cat build/export-from-advanced-compile.js >> $@
	echo "jQuery.fn['jsoSchema'] = jsoSchema;" >> $@
	echo "})(jQuery);" >> $@

$(RAW)/jso/Schema.js: $(SRC)/jsoSchema.js
	mkdir -p $(dir $@)
	echo "define([ ], function () { " > $@
	cat $< >> $@
	echo >> $@
	cat build/export-from-advanced-compile.js >> $@
	echo "return jsoSchema;" >> $@
	echo "});" >> $@

.PHONY: test

node_modules/%:
	npm install $(notdir $@)

build/compiler.jar:
	mkdir -p build
	wget "http://dl.google.com/closure-compiler/compiler-latest.zip" -O build/compiler-latest.zip
	(cd build && unzip compiler-latest.zip compiler.jar && rm compiler-latest.zip)

define js_compile
java -jar build/compiler.jar \
     --externs build/externs.js \
     --compilation_level ADVANCED_OPTIMIZATIONS \
     --warning_level=VERBOSE \
     --property_map_output_file $(patsubst %.js,%.property-map,$<) \
     --create_source_map $(patsubst %.js,%.source-map,$<) \
     --js $(SRC)/jsoSchema_types.js \
     --js $< --js_output_file $@ 2>&1
endef

$(MIN)/jso/Schema.js: build/raw/jso/Schema.js build/compiler.jar 
	mkdir -p $(dir $@)
	$(js_compile)

$(MIN)/jquery.jsoSchema.js: build/raw/jquery.jsoSchema.js build/compiler.jar 
	mkdir -p $(dir $@)
	$(js_compile)

compile: $(MIN)/jso/Schema.js $(MIN)/jquery.jsoSchema.js

clean:
	rm -rf build/min build/raw build/README.html

distclean:
	rm -rf node_modules build
	git checkout build

release:
	git checkout -b $(VERSION)
	make distclean
	make compile
	find build/min build/raw -name "*.js" -print0 | xargs -0 git add -f
	echo $(VERSION) > ./VERSION
	git add VERSION
	make test

build/README.html: README.asciidoc
	mkdir -p $(dir $@)
	asciidoc -o $@ README.asciidoc 

doc: build/README.html
