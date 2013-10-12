all: build/jquery.jsoSchema.js build/jsoSchema.js

clean:
	rm -rf build

build/jquery.jsoSchema.js: jsoSchema.js
	mkdir -p build
	echo "(function (jQuery) { " > build/jquery.jsoSchema.js
	cat ./jsoSchema.js >> build/jquery.jsoSchema.js
	echo >> build/jquery.jsoSchema.js
	echo "jQuery.fn.jsoSchema = jsoSchema.api;" >> build/jquery.jsoSchema.js
	echo "})(jQuery);" >> build/jquery.jsoSchema.js

build/jsoSchema.js: jsoSchema.js
	mkdir -p build
	echo "define([ ], function () { " >> build/jsoSchema.js
	cat ./jsoSchema.js >> build/jsoSchema.js
	echo >> build/jsoSchema.js
	echo "return jsoSchema.api;" >> build/jsoSchema.js
	echo "});" >> build/jsoSchema.js

test: clean build/jsoSchema.js
	nodejs ./test/test.js
