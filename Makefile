run:
	npx expo prebuild --clean
	npx expo run:ios 


check:
	npx expo install --check $(lib)


rm-logs:
	remove-logs:
	@find src -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) \
		| xargs sed -i '' -E 's/^\s*console\.log\(.*\);\s*$$//g'

# ^\s*console\.log\(.*\);\s*$

# xcrun simctl boot "iPhone 15 Plus"
# open -a Simulator


run2:
	lsof -i :19001 | awk 'NR!=1 {print $$2}' | xargs -r kill -9
	expo start --port 19001 

# npx expo run:ios --device "iPhone 15 Plus"


maestro:
	maestro test .maestro/flows/auth-flow.yaml
#	maestro test .maestro/flows/smoke-test.yaml


testflight:
	npx testflight


#::: ^\s*console\.log\(.*\);\s*\n?

flash:
	gemini --model gemini-2.5-flash

pro:
	gemini --model gemini-2.5-pro

upgrade-modules:
	npx npm-check-updates -u
