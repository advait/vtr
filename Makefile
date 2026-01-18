.PHONY: proto build test clean

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

# Clean
clean:
	rm -rf bin/
	rm -f proto/*.pb.go
