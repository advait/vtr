package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"net"
	"os"
	"strings"

	"google.golang.org/grpc/credentials"
)

type tokenAuth struct {
	token            string
	requireTransport bool
}

func (t tokenAuth) GetRequestMetadata(ctx context.Context, _ ...string) (map[string]string, error) {
	return map[string]string{"authorization": "Bearer " + t.token}, nil
}

func (t tokenAuth) RequireTransportSecurity() bool {
	return t.requireTransport
}

func parseAuthMode(value string) (bool, bool, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "":
		return false, false, nil
	case "token":
		return true, false, nil
	case "mtls":
		return false, true, nil
	case "both":
		return true, true, nil
	default:
		return false, false, fmt.Errorf("unknown auth mode %q", value)
	}
}

func readToken(path string) (string, error) {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return "", errors.New("auth token file is required")
	}
	data, err := os.ReadFile(trimmed)
	if err != nil {
		return "", err
	}
	token := strings.TrimSpace(string(data))
	if token == "" {
		return "", errors.New("auth token is empty")
	}
	return token, nil
}

func buildServerTLSConfig(cfg serverConfig, auth authConfig, requireClientCert bool) (*tls.Config, error) {
	certFile := strings.TrimSpace(cfg.CertFile)
	keyFile := strings.TrimSpace(cfg.KeyFile)
	if certFile == "" || keyFile == "" {
		if requireClientCert {
			return nil, errors.New("server cert_file and key_file are required for mTLS")
		}
		return nil, nil
	}
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("missing server TLS cert/key (cert_file=%s key_file=%s). Run `vtr setup` or set [server] cert_file/key_file to valid paths", certFile, keyFile)
		}
		return nil, err
	}
	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS12,
	}
	if requireClientCert {
		caFile := strings.TrimSpace(auth.CaFile)
		if caFile == "" {
			return nil, errors.New("auth ca_file is required for mTLS")
		}
		caData, err := os.ReadFile(caFile)
		if err != nil {
			if os.IsNotExist(err) {
				return nil, fmt.Errorf("missing auth CA file (ca_file=%s). Run `vtr setup` or set [auth] ca_file to a valid path", caFile)
			}
			return nil, err
		}
		pool := x509.NewCertPool()
		if !pool.AppendCertsFromPEM(caData) {
			return nil, errors.New("failed to parse CA certificate")
		}
		tlsConfig.ClientCAs = pool
		tlsConfig.ClientAuth = tls.RequireAndVerifyClientCert
	}
	return tlsConfig, nil
}

func buildClientTLS(cfg *clientConfig, requireClientCert bool) (credentials.TransportCredentials, error) {
	if cfg == nil {
		return nil, errors.New("auth config is required")
	}
	caPath := strings.TrimSpace(cfg.Auth.CaFile)
	if caPath == "" {
		return nil, errors.New("auth ca_file is required for TLS")
	}
	caData, err := os.ReadFile(caPath)
	if err != nil {
		return nil, err
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(caData) {
		return nil, errors.New("failed to parse CA certificate")
	}
	tlsConfig := &tls.Config{
		RootCAs:    pool,
		MinVersion: tls.VersionTLS12,
	}
	if requireClientCert {
		certPath := strings.TrimSpace(cfg.Auth.CertFile)
		keyPath := strings.TrimSpace(cfg.Auth.KeyFile)
		if certPath == "" || keyPath == "" {
			return nil, errors.New("auth cert_file and key_file are required for mTLS")
		}
		cert, err := tls.LoadX509KeyPair(certPath, keyPath)
		if err != nil {
			return nil, err
		}
		tlsConfig.Certificates = []tls.Certificate{cert}
	}
	return credentials.NewTLS(tlsConfig), nil
}

func isLoopbackHost(addr string) bool {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return false
	}
	if host == "" {
		return false
	}
	trimmed := strings.Trim(host, "[]")
	if strings.EqualFold(trimmed, "localhost") {
		return true
	}
	if ip := net.ParseIP(trimmed); ip != nil {
		return ip.IsLoopback()
	}
	return false
}
