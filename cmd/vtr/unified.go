package main

import (
	"net/http"
	"strings"

	"google.golang.org/grpc"
)

func grpcOrHTTPHandler(grpcServer *grpc.Server, httpHandler http.Handler) http.Handler {
	if httpHandler == nil {
		httpHandler = http.NotFoundHandler()
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.ProtoMajor == 2 && strings.HasPrefix(r.Header.Get("Content-Type"), "application/grpc") {
			grpcServer.ServeHTTP(w, r)
			return
		}
		httpHandler.ServeHTTP(w, r)
	})
}
