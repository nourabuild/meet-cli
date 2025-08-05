run:
	npx expo prebuild --clean
	npx expo run:ios 


check:
	npx expo install --check $(lib)