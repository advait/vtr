.PHONY: proto build test clean shim shim-sanitize shim-llvm-ir shim-llvm-asan test-race-cgo test-sanitize-cgo

CGO_TEST_PKGS ?= ./go-ghostty/... ./server/...
ZIG ?= zig
CLANG ?= clang
CXX ?= clang++
AR ?= ar
SHIM_DIR ?= go-ghostty/shim
SHIM_ASAN_DIR ?= $(SHIM_DIR)/zig-out-asan
SHIM_LLVM_IR ?= $(SHIM_DIR)/zig-out/llvm-ir/vtr-ghostty-vt.ll
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

shim-llvm-ir:
	cd $(SHIM_DIR) && $(ZIG) build -Dghostty=$(GHOSTTY_ROOT) -Doptimize=Debug -Dframe_pointers=true -Demit_llvm_ir=true

shim-llvm-asan: shim-llvm-ir
	mkdir -p $(SHIM_ASAN_DIR)/lib $(SHIM_ASAN_DIR)/include
	$(CLANG) -x ir -c -fsanitize=address -fno-omit-frame-pointer -fPIC \
		-o $(SHIM_ASAN_DIR)/lib/vtr-ghostty-vt-asan.o $(SHIM_LLVM_IR)
	$(AR) rcs $(SHIM_ASAN_DIR)/lib/libvtr-ghostty-vt.a $(SHIM_ASAN_DIR)/lib/vtr-ghostty-vt-asan.o
	cp $(SHIM_DIR)/zig-out/include/vtr_ghostty_vt.h $(SHIM_ASAN_DIR)/include/

test-race-cgo: shim
	CGO_ENABLED=1 go test -race $(CGO_TEST_PKGS)

test-sanitize-cgo: shim-llvm-asan
	$(SANITIZER_ENV) CGO_ENABLED=1 CC=$(CLANG) CXX=$(CXX) go test -asan -tags=asan $(CGO_TEST_PKGS)

# Clean
clean:
	rm -rf bin/
	rm -f proto/*.pb.go
