package main

import "github.com/spf13/cobra"

func newRootCmd() *cobra.Command {
	root := &cobra.Command{
		Use:          "vtr",
		Short:        "Headless terminal multiplexer client",
		SilenceUsage: true,
	}

	root.AddCommand(
		newVersionCmd(),
		newServeCmd(),
		newListCmd(),
		newSpawnCmd(),
		newInfoCmd(),
		newScreenCmd(),
		newSendCmd(),
		newKeyCmd(),
		newRawCmd(),
		newResizeCmd(),
		newKillCmd(),
		newRemoveCmd(),
	)

	return root
}
