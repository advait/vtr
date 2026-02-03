package main

import "github.com/spf13/cobra"

func newAgentCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "agent",
		Short: "Agent CLI (JSON output)",
		Example: `vtr agent ls
vtr agent spawn demo --cmd "bash"
vtr agent spawn spoke-a:demo --cmd "bash"
vtr agent send --submit demo "git status"
vtr agent send --wait-for-idle --idle 5s demo "make test"
vtr agent screen demo --ansi
vtr agent idle demo other --idle 5s --timeout 30s`,
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
