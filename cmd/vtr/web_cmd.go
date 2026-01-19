package main

import (
	"io/fs"
	"net/http"

	webassets "github.com/advait/vtrpc/web"
	"github.com/spf13/cobra"
	"nhooyr.io/websocket"
)

type webOptions struct {
	addr string
}

func newWebCmd() *cobra.Command {
	opts := webOptions{}
	cmd := &cobra.Command{
		Use:   "web",
		Short: "Serve the web UI",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runWeb(opts)
		},
	}

	cmd.Flags().StringVar(&opts.addr, "addr", ":8080", "address to listen on")

	return cmd
}

func runWeb(opts webOptions) error {
	dist, err := fs.Sub(webassets.DistFS, "dist")
	if err != nil {
		return err
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleWebsocket)
	mux.Handle("/", http.FileServer(http.FS(dist)))

	srv := &http.Server{
		Addr:    opts.addr,
		Handler: mux,
	}

	return srv.ListenAndServe()
}

func handleWebsocket(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	ctx := r.Context()
	for {
		if _, _, err := conn.Read(ctx); err != nil {
			return
		}
	}
}
