.PHONY: proto build test clean shim shim-sanitize test-race-cgo test-sanitize-cgo

CGO_TEST_PKGS ?= ./go-ghostty/... ./server/...
ZIG ?= zig
SHIM_DIR ?= go-ghostty/shim
GHOSTTY_ROOT ?= $(CURDIR)/ghostty
SANITIZER_DIR ?= $(SHIM_DIR)/sanitizers
ASAN_SUPP ?= $(SANITIZER_DIR)/asan.supp
LSAN_SUPP ?= $(SANITIZER_DIR)/lsan.supp
CGOCHECK_EXPERIMENT ?= cgocheck2

CGOCHECK_ENV = GODEBUG=cgocheck=2
ifneq ($(strip $(CGOCHECK_EXPERIMENT)),)
CGOCHECK_ENV += GOEXPERIMENT=$(CGOCHECK_EXPERIMENT)
endif
SANITIZER_ENV = $(CGOCHECK_ENV) ASAN_OPTIONS=detect_leaks=1:halt_on_error=1:suppressions=$(ASAN_SUPP) \
  LSAN_OPTIONS=suppressions=$(LSAN_SUPP)

# Proto generation
proto:
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		proto/vtr.proto

# Build
build:
	go build -o bin/vtr ./cmd/vtr

# Test
test:
	go test ./...

shim:
	cd $(SHIM_DIR) && $(ZIG) build -Dghostty=$(GHOSTTY_ROOT)

shim-sanitize:
	cd $(SHIM_DIR) && $(ZIG) build -Dghostty=$(GHOSTTY_ROOT) -Doptimize=Debug -Dframe_pointers=true

test-race-cgo: shim
	CGO_ENABLED=1 go test -race $(CGO_TEST_PKGS)

test-sanitize-cgo: shim-sanitize
	$(SANITIZER_ENV) CGO_ENABLED=1 CC=clang CXX=clang++ go test -asan $(CGO_TEST_PKGS)

# Clean
clean:
	rm -rf bin/
	rm -f proto/*.pb.go
