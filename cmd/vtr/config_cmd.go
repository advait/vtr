package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newConfigCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "Manage client configuration",
	}
	cmd.AddCommand(newConfigResolveCmd())
	return cmd
}

func newConfigResolveCmd() *cobra.Command {
	var jsonOut bool
	cmd := &cobra.Command{
		Use:   "resolve",
		Short: "Show resolved coordinator addresses",
		RunE: func(cmd *cobra.Command, _ []string) error {
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			if len(coords) == 0 {
				coords = []coordinatorRef{{Name: hubName(defaultHubAddr), Path: defaultHubAddr}}
			}
			if output == outputJSON {
				items := make([]jsonCoordinator, 0, len(coords))
				for _, coord := range coords {
					items = append(items, jsonCoordinator{Name: coord.Name, Path: coord.Path})
				}
				return writeJSON(cmd.OutOrStdout(), jsonCoordinators{Coordinators: items})
			}
			for _, coord := range coords {
				fmt.Fprintf(cmd.OutOrStdout(), "%s\t%s\n", coord.Name, coord.Path)
			}
			return nil
		},
	}
	cmd.Flags().BoolVar(&jsonOut, "json", false, "output as JSON")
	return cmd
}
