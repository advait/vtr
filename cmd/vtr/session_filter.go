package main

import (
	"strings"

	proto "github.com/advait/vtrpc/proto"
)

func filterSessionsByPrefix(sessions []*proto.Session, prefix string) []*proto.Session {
	prefix = strings.TrimSpace(prefix)
	if prefix == "" || len(sessions) == 0 {
		return sessions
	}
	needle := prefix + ":"
	out := make([]*proto.Session, 0, len(sessions))
	for _, session := range sessions {
		if session == nil {
			continue
		}
		if strings.HasPrefix(session.GetName(), needle) {
			out = append(out, session)
		}
	}
	return out
}
