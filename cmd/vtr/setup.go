package main

import (
	"bufio"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"fmt"
	"math"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

type setupOptions struct{}

func newSetupCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "setup",
		Short: "Initialize local hub configuration and auth material",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runSetup(setupOptions{})
		},
	}
	return cmd
}

func runSetup(_ setupOptions) error {
	printSetupBanner()

	baseDir := configDir()
	if strings.TrimSpace(baseDir) == "" {
		return errors.New("config directory is unavailable (set VTRPC_CONFIG_DIR)")
	}
	printSetupPlan(baseDir)

	configDir, err := resolveSetupConfigDir(baseDir)
	if err != nil {
		return err
	}
	fmt.Fprintf(os.Stdout, "Using config directory: %s\n\n", configDir)

	configPath := filepath.Join(configDir, defaultConfigFileName)
	if exists(configPath) {
		confirm, err := promptConfirm(fmt.Sprintf("%s exists; overwrite?", configPath), false)
		if err != nil {
			return err
		}
		if !confirm {
			fmt.Fprintln(os.Stdout, "vtr setup: aborted")
			return nil
		}
	}

	if err := os.MkdirAll(configDir, 0o700); err != nil {
		return fmt.Errorf("unable to create config dir %s: %w", configDir, err)
	}

	caCert, caKey, err := generateCA("vtrpc")
	if err != nil {
		return err
	}
	serverCert, serverKey, err := generateLeafCert("vtrpc-server", caCert, caKey, true)
	if err != nil {
		return err
	}
	clientCert, clientKey, err := generateLeafCert("vtrpc-client", caCert, caKey, false)
	if err != nil {
		return err
	}

	caPath := filepath.Join(configDir, "ca.crt")
	serverCertPath := filepath.Join(configDir, "server.crt")
	serverKeyPath := filepath.Join(configDir, "server.key")
	clientCertPath := filepath.Join(configDir, "client.crt")
	clientKeyPath := filepath.Join(configDir, "client.key")
	tokenPath := filepath.Join(configDir, "token")

	if err := writePEM(caPath, "CERTIFICATE", caCert.Raw); err != nil {
		return err
	}
	if err := writePEM(serverCertPath, "CERTIFICATE", serverCert.Raw); err != nil {
		return err
	}
	if err := writePEM(serverKeyPath, "RSA PRIVATE KEY", x509.MarshalPKCS1PrivateKey(serverKey)); err != nil {
		return err
	}
	if err := writePEM(clientCertPath, "CERTIFICATE", clientCert.Raw); err != nil {
		return err
	}
	if err := writePEM(clientKeyPath, "RSA PRIVATE KEY", x509.MarshalPKCS1PrivateKey(clientKey)); err != nil {
		return err
	}

	token, err := generateToken(32)
	if err != nil {
		return err
	}
	if err := os.WriteFile(tokenPath, []byte(token+"\n"), 0o600); err != nil {
		return err
	}

	config := buildSetupConfig(configDir)
	if err := os.WriteFile(configPath, []byte(config), 0o644); err != nil {
		return err
	}

	fmt.Fprintf(os.Stdout, "vtr setup: wrote %s\n", configPath)
	if envOverride := strings.TrimSpace(os.Getenv("VTRPC_CONFIG_DIR")); envOverride != "" && envOverride != configDir {
		fmt.Fprintf(os.Stdout, "vtr setup: note VTRPC_CONFIG_DIR=%s is set; this config is in %s\n", envOverride, configDir)
	}
	return nil
}

func printSetupBanner() {
	banner := []string{
		"░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░▒▓███████▓▒░░▒▓███████▓▒░ ░▒▓██████▓▒░  ",
		"░▒▓█▓▒░░▒▓█▓▒░  ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ",
		" ░▒▓█▓▒▒▓█▓▒░   ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░        ",
		" ░▒▓█▓▒▒▓█▓▒░   ░▒▓█▓▒░   ░▒▓███████▓▒░░▒▓███████▓▒░░▒▓█▓▒░        ",
		"  ░▒▓█▓▓█▓▒░    ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        ",
		"  ░▒▓█▓▓█▓▒░    ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░ ",
		"   ░▒▓██▓▒░     ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░       ░▒▓██████▓▒░  ",
	}
	fmt.Fprintln(os.Stdout)
	if supportsColor() {
		useTrueColor := supportsTrueColor()
		for row, line := range banner {
			fmt.Fprintln(os.Stdout, colorizeLine(line, row, useTrueColor))
		}
	} else {
		fmt.Fprintln(os.Stdout, strings.Join(banner, "\n"))
	}
	fmt.Fprintln(os.Stdout, "Welcome to vtrpc setup.")
	fmt.Fprintln(os.Stdout)
}

func printSetupPlan(configDir string) {
	fmt.Fprintln(os.Stdout, "This will bootstrap vtrpc on this machine:")
	fmt.Fprintf(os.Stdout, "- Create config in %s (override with VTRPC_CONFIG_DIR)\n", configDir)
	fmt.Fprintln(os.Stdout, "- Generate keys and certificates for secure connection")
	fmt.Fprintln(os.Stdout, "- Create vtrpc.toml config based on your preferences")
	fmt.Fprintln(os.Stdout)
}

func supportsColor() bool {
	if strings.TrimSpace(os.Getenv("NO_COLOR")) != "" {
		return false
	}
	term := strings.TrimSpace(os.Getenv("TERM"))
	if term == "" || term == "dumb" {
		return false
	}
	info, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return (info.Mode() & os.ModeCharDevice) != 0
}

func supportsTrueColor() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("COLORTERM")))
	return strings.Contains(value, "truecolor") || strings.Contains(value, "24bit")
}

func colorizeLine(line string, row int, trueColor bool) string {
	var out strings.Builder
	col := 0
	for _, ch := range line {
		if ch == ' ' {
			out.WriteRune(ch)
			col++
			continue
		}
		hue := math.Mod(float64(row)*18+float64(col)*6, 360)
		red, green, blue := hslToRGB(hue, 0.85, 0.55)
		if trueColor {
			fmt.Fprintf(&out, "\x1b[38;2;%d;%d;%dm%c", red, green, blue, ch)
		} else {
			fmt.Fprintf(&out, "\x1b[38;5;%dm%c", rgbTo256(red, green, blue), ch)
		}
		col++
	}
	out.WriteString("\x1b[0m")
	return out.String()
}

func hslToRGB(h, s, l float64) (int, int, int) {
	h = math.Mod(h, 360)
	c := (1 - math.Abs(2*l-1)) * s
	x := c * (1 - math.Abs(math.Mod(h/60, 2)-1))
	m := l - c/2
	var r1, g1, b1 float64
	switch {
	case h < 60:
		r1, g1, b1 = c, x, 0
	case h < 120:
		r1, g1, b1 = x, c, 0
	case h < 180:
		r1, g1, b1 = 0, c, x
	case h < 240:
		r1, g1, b1 = 0, x, c
	case h < 300:
		r1, g1, b1 = x, 0, c
	default:
		r1, g1, b1 = c, 0, x
	}
	return clamp8((r1 + m) * 255), clamp8((g1 + m) * 255), clamp8((b1 + m) * 255)
}

func clamp8(value float64) int {
	if value <= 0 {
		return 0
	}
	if value >= 255 {
		return 255
	}
	return int(math.Round(value))
}

func rgbTo256(r, g, b int) int {
	toLevel := func(v int) int {
		return int(math.Round(float64(v) / 255 * 5))
	}
	ri := toLevel(r)
	gi := toLevel(g)
	bi := toLevel(b)
	return 16 + (36 * ri) + (6 * gi) + bi
}

func buildSetupConfig(configDir string) string {
	lines := []string{
		"[hub]",
		fmt.Sprintf("addr = %q", defaultHubAddr),
		"web_enabled = true",
		"",
		"[auth]",
		"mode = \"both\"",
		fmt.Sprintf("token_file = %q", filepath.Join(configDir, "token")),
		fmt.Sprintf("ca_file = %q", filepath.Join(configDir, "ca.crt")),
		fmt.Sprintf("cert_file = %q", filepath.Join(configDir, "client.crt")),
		fmt.Sprintf("key_file = %q", filepath.Join(configDir, "client.key")),
		"",
		"[server]",
		fmt.Sprintf("cert_file = %q", filepath.Join(configDir, "server.crt")),
		fmt.Sprintf("key_file = %q", filepath.Join(configDir, "server.key")),
		"",
		"[tui]",
		"spinner = \"tick\"",
		"status_icons = \"nerd\"",
		"",
	}
	return strings.Join(lines, "\n")
}

func generateToken(bytes int) (string, error) {
	if bytes <= 0 {
		return "", errors.New("token size must be positive")
	}
	buf := make([]byte, bytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func generateCA(commonName string) (*x509.Certificate, *rsa.PrivateKey, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, nil, err
	}
	serial, err := randSerial()
	if err != nil {
		return nil, nil, err
	}
	tmpl := &x509.Certificate{
		SerialNumber:          serial,
		Subject:               pkix.Name{CommonName: commonName},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(3650 * 24 * time.Hour),
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageCRLSign,
		BasicConstraintsValid: true,
		IsCA:                  true,
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		return nil, nil, err
	}
	cert, err := x509.ParseCertificate(der)
	if err != nil {
		return nil, nil, err
	}
	return cert, key, nil
}

func generateLeafCert(commonName string, ca *x509.Certificate, caKey *rsa.PrivateKey, isServer bool) (*x509.Certificate, *rsa.PrivateKey, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, nil, err
	}
	serial, err := randSerial()
	if err != nil {
		return nil, nil, err
	}
	usage := x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment
	extUsages := []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}
	if isServer {
		extUsages = []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}
	}
	tmpl := &x509.Certificate{
		SerialNumber: serial,
		Subject:      pkix.Name{CommonName: commonName},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(825 * 24 * time.Hour),
		KeyUsage:     usage,
		ExtKeyUsage:  extUsages,
	}
	if isServer {
		tmpl.DNSNames = []string{"localhost"}
		tmpl.IPAddresses = []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")}
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, ca, &key.PublicKey, caKey)
	if err != nil {
		return nil, nil, err
	}
	cert, err := x509.ParseCertificate(der)
	if err != nil {
		return nil, nil, err
	}
	return cert, key, nil
}

func randSerial() (*big.Int, error) {
	limit := new(big.Int).Lsh(big.NewInt(1), 128)
	serial, err := rand.Int(rand.Reader, limit)
	if err != nil {
		return nil, err
	}
	return serial, nil
}

func writePEM(path, blockType string, der []byte) error {
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	defer file.Close()
	return pem.Encode(file, &pem.Block{Type: blockType, Bytes: der})
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func canWriteDir(dir string) bool {
	probe, err := os.CreateTemp(dir, "vtrpc-check-")
	if err != nil {
		return false
	}
	name := probe.Name()
	_ = probe.Close()
	_ = os.Remove(name)
	return true
}

func resolveSetupConfigDir(dir string) (string, error) {
	if strings.TrimSpace(dir) == "" {
		return "", errors.New("config directory is unavailable (set VTRPC_CONFIG_DIR)")
	}
	if isWritableConfigDir(dir) {
		return dir, nil
	}
	fallback := fallbackConfigDir()
	if fallback != "" && isWritableConfigDir(fallback) {
		confirm, err := promptConfirm(
			fmt.Sprintf("%s is not writable; use %s instead? (set VTRPC_CONFIG_DIR to persist)", dir, fallback),
			true,
		)
		if err != nil {
			return "", err
		}
		if confirm {
			return fallback, nil
		}
	}

	for {
		value, err := promptInput("Enter a writable config directory (or press Enter to cancel)")
		if err != nil {
			return "", err
		}
		value = strings.TrimSpace(value)
		if value == "" {
			return "", fmt.Errorf("%s is not writable; set VTRPC_CONFIG_DIR to a writable location", dir)
		}
		if isWritableConfigDir(value) {
			return value, nil
		}
		fmt.Fprintf(os.Stdout, "%s is not writable.\n", value)
	}
}

func isWritableConfigDir(dir string) bool {
	if strings.TrimSpace(dir) == "" {
		return false
	}
	if exists(dir) {
		return canWriteDir(dir)
	}
	parent := filepath.Dir(dir)
	if parent == "" || parent == dir {
		return false
	}
	return canWriteDir(parent)
}

func fallbackConfigDir() string {
	home, err := os.UserHomeDir()
	if err == nil && home != "" {
		return filepath.Join(home, ".vtrpc")
	}
	return filepath.Join(os.TempDir(), "vtrpc")
}

func promptConfirm(prompt string, defaultYes bool) (bool, error) {
	label := "y/N"
	if defaultYes {
		label = "Y/n"
	}
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Fprintf(os.Stdout, "%s [%s]: ", prompt, label)
		input, err := reader.ReadString('\n')
		if err != nil {
			return false, err
		}
		trimmed := strings.TrimSpace(strings.ToLower(input))
		if trimmed == "" {
			return defaultYes, nil
		}
		switch trimmed {
		case "y", "yes":
			return true, nil
		case "n", "no":
			return false, nil
		default:
			fmt.Fprintln(os.Stdout, "Please answer y or n.")
		}
	}
}

func promptInput(prompt string) (string, error) {
	reader := bufio.NewReader(os.Stdin)
	fmt.Fprintf(os.Stdout, "%s: ", prompt)
	input, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(input), nil
}
