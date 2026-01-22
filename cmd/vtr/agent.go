package main

import "github.com/spf13/cobra"

func newAgentCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "agent",
		Short: "Agent CLI (JSON output)",
	}
	cmd.AddCommand(
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
		newGrepCmd(),
		newWaitCmd(),
		newIdleCmd(),
	)
	return cmd
}
