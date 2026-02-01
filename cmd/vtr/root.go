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
		newHubCmd(),
		newSpokeCmd(),
		newAgentCmd(),
		newTuiCmd(),
		newSetupCmd(),
		newServiceCmd(),
	)

	return root
}
